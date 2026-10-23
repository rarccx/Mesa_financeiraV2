-- Mesa Financeira v6: run after backup, BEFORE enabling Google.
-- Does not update financial data, passwords or existing policies.
-- Requires existing public.sou_admin() backed by server-side admin roles.
BEGIN;
DO $$ BEGIN
 IF to_regprocedure('public.sou_admin()') IS NULL THEN
  RAISE EXCEPTION 'A função sou_admin() precisa existir antes desta instalação.';
 END IF;
END $$;

CREATE TABLE public.mf_google_allowlist (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 email text NOT NULL UNIQUE CHECK (email = lower(btrim(email))),
 authorized_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 authorized_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mf_google_allowlist TO authenticated;
GRANT ALL ON public.mf_google_allowlist TO service_role;
ALTER TABLE public.mf_google_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY mf_google_read_own ON public.mf_google_allowlist FOR SELECT TO authenticated USING (user_id=auth.uid());

CREATE TABLE public.mf_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT '' CHECK (length(display_name)<=120),
 avatar_url text NOT NULL DEFAULT '' CHECK (length(avatar_url)<=2048),
 preferences jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, UPDATE ON public.mf_profiles TO authenticated;
GRANT ALL ON public.mf_profiles TO service_role;
ALTER TABLE public.mf_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY mf_profile_read_own ON public.mf_profiles FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY mf_profile_update_own ON public.mf_profiles FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE FUNCTION public.mf_create_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.mf_profiles(user_id,display_name,avatar_url)
 VALUES(NEW.id,left(coalesce(NEW.raw_user_meta_data->>'full_name',''),120),left(coalesce(NEW.raw_user_meta_data->>'avatar_url',''),2048))
 ON CONFLICT(user_id) DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.mf_create_profile() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER mf_profile_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.mf_create_profile();
INSERT INTO public.mf_profiles(user_id,display_name,avatar_url)
 SELECT id,left(coalesce(raw_user_meta_data->>'full_name',''),120),left(coalesce(raw_user_meta_data->>'avatar_url',''),2048) FROM auth.users;

-- Email comes from the verified Auth identity, NEVER from client input/metadata.
CREATE FUNCTION public.mf_google_authorized(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.mf_google_allowlist a
  JOIN auth.users u ON u.id=a.user_id
  JOIN auth.identities i ON i.user_id=u.id AND i.provider='google'
  WHERE u.id=p_user AND u.email_confirmed_at IS NOT NULL
    AND a.email=lower(btrim(u.email))
    AND a.email=lower(btrim(i.identity_data->>'email'))
    AND i.identity_data->>'email_verified'='true'
 );
$$;
REVOKE ALL ON FUNCTION public.mf_google_authorized(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.mf_google_status() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND public.mf_google_authorized(auth.uid());
$$;
REVOKE ALL ON FUNCTION public.mf_google_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mf_google_status() TO authenticated;

CREATE FUNCTION public.mf_google_admin_list() RETURNS TABLE(user_id uuid,email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.sou_admin(),false) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT a.user_id,a.email FROM public.mf_google_allowlist a;
END $$;
CREATE FUNCTION public.mf_google_admin_set(p_user uuid,p_enabled boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_email text;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.sou_admin(),false) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
 IF p_enabled THEN
  SELECT lower(btrim(u.email)) INTO v_email FROM auth.users u WHERE u.id=p_user AND u.email_confirmed_at IS NOT NULL;
  IF v_email IS NULL OR v_email='' THEN RAISE EXCEPTION 'Cliente inexistente ou e-mail ainda não confirmado'; END IF;
  INSERT INTO public.mf_google_allowlist(user_id,email,authorized_by) VALUES(p_user,v_email,auth.uid())
  ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,authorized_by=excluded.authorized_by,authorized_at=now();
 ELSE DELETE FROM public.mf_google_allowlist WHERE user_id=p_user;
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.mf_google_admin_list() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.mf_google_admin_set(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mf_google_admin_list(),public.mf_google_admin_set(uuid,boolean) TO authenticated;

-- Activate in Authentication > Hooks > Before User Created.
-- New Google users are always denied; existing confirmed email users are linked by Auth.
CREATE FUNCTION public.mf_before_user_created(event jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF event->'user'->'app_metadata'->>'provider'='google'
    OR coalesce(event->'user'->'app_metadata'->'providers','[]'::jsonb) ? 'google' THEN
  RETURN jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Acesso Google não autorizado. Solicite liberação ao administrador.'));
 END IF;
 RETURN '{}'::jsonb;
END $$;

-- Activate in Authentication > Hooks > Custom Access Token.
-- Keeps a signed session flag on refresh, and blocks token issuance when revoked.
CREATE FUNCTION public.mf_custom_access_token(event jsonb) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE claims jsonb:=event->'claims'; google_session boolean;
BEGIN
 google_session:=coalesce((claims->>'mf_google_session')='true',false)
   OR event->>'authentication_method'='oauth'
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(claims->'amr','[]'::jsonb)) a WHERE a->>'method'='oauth');
 IF google_session AND NOT public.mf_google_authorized((event->>'user_id')::uuid) THEN
  RETURN jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Acesso Google não autorizado. Solicite liberação ao administrador.'));
 END IF;
 claims:=jsonb_set(claims,'{mf_google_session}',to_jsonb(coalesce(google_session,false)),true);
 RETURN jsonb_build_object('claims',claims);
END $$;
REVOKE ALL ON FUNCTION public.mf_before_user_created(jsonb),public.mf_custom_access_token(jsonb) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.mf_before_user_created(jsonb),public.mf_custom_access_token(jsonb) TO supabase_auth_admin;

-- Restrictive policies compose with ALL existing permissive policies.
-- They never grant another client's access. Revocation affects existing JWTs immediately.
CREATE FUNCTION public.mf_session_allowed() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE WHEN auth.uid() IS NULL THEN true
 WHEN coalesce(auth.jwt()->>'mf_google_session','false')='true'
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(auth.jwt()->'amr','[]'::jsonb)) a WHERE a->>'method'='oauth')
 THEN public.mf_google_authorized(auth.uid()) ELSE true END;
$$;
REVOKE ALL ON FUNCTION public.mf_session_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mf_session_allowed() TO anon,authenticated;
DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity LOOP
  EXECUTE format('CREATE POLICY mf_google_session_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.mf_session_allowed()) WITH CHECK (public.mf_session_allowed())',t.tablename);
 END LOOP;
END $$;
CREATE POLICY mf_google_storage_guard ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
 USING(public.mf_session_allowed()) WITH CHECK(public.mf_session_allowed());
COMMIT;
-- No Google emails are authorized automatically.
