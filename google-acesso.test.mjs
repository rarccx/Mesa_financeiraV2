import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE supabase_auth_admin;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
CREATE TABLE auth.identities(user_id uuid,provider text,identity_data jsonb);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.uid',true),'')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT coalesce(nullif(current_setting('request.jwt',true),''),'{}')::jsonb $$;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated,anon;
CREATE FUNCTION public.sou_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('request.admin',true),'false')='true' $$;
CREATE TABLE public.mesa_dados(user_id uuid,dados jsonb); GRANT SELECT,INSERT,UPDATE,DELETE ON public.mesa_dados TO authenticated;
ALTER TABLE public.mesa_dados ENABLE ROW LEVEL SECURITY;
CREATE POLICY own ON public.mesa_dados TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE TABLE storage.objects(id text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
 ('00000000-0000-0000-0000-000000000001','client@example.test',now()),
 ('00000000-0000-0000-0000-000000000002','other@example.test',now());
INSERT INTO auth.identities VALUES
 ('00000000-0000-0000-0000-000000000001','google','{"email":"client@example.test","email_verified":true}'),
 ('00000000-0000-0000-0000-000000000002','google','{"email":"other@example.test","email_verified":true}');
INSERT INTO public.mesa_dados VALUES('00000000-0000-0000-0000-000000000001','{"balance":123}'),('00000000-0000-0000-0000-000000000002','{"balance":456}');
`);
await db.exec(await readFile(new URL('./google-acesso.sql',import.meta.url),'utf8'));
const uid='00000000-0000-0000-0000-000000000001';
async function hook(method,claims={}){
 const event={user_id:uid,authentication_method:method,claims};
 return (await db.query('select public.mf_custom_access_token($1::jsonb) as result',[JSON.stringify(event)])).rows[0].result;
}
assert.equal((await hook('oauth')).error.http_code,403);console.log('PASS: existing but unapproved Google denied');
assert.equal((await hook('password')).claims.mf_google_session,false);console.log('PASS: password login preserved');
const created=await db.query(`select public.mf_before_user_created('{"user":{"app_metadata":{"provider":"google"}}}') as result`);
assert.equal(created.rows[0].result.error.http_code,403);console.log('PASS: new Google user rejected');
await db.exec(`SELECT set_config('request.uid','${uid}',false);SELECT set_config('request.admin','false',false);`);
await assert.rejects(()=>db.query('select public.mf_google_admin_set($1,true)',[uid]),/Acesso negado/);console.log('PASS: non-admin cannot authorize');
await db.exec(`SELECT set_config('request.admin','true',false);`);
await db.query('select public.mf_google_admin_set($1,true)',[uid]);
assert.equal((await hook('oauth')).claims.mf_google_session,true);console.log('PASS: approved matching verified Google accepted');
await db.exec(`UPDATE auth.identities SET identity_data='{"email":"wrong@example.test","email_verified":true}' WHERE user_id='${uid}'`);
assert.equal((await hook('oauth')).error.http_code,403);console.log('PASS: different Google email denied');
await db.exec(`UPDATE auth.identities SET identity_data='{"email":"client@example.test","email_verified":false}' WHERE user_id='${uid}'`);
assert.equal((await hook('oauth')).error.http_code,403);console.log('PASS: unverified Google email denied');
await db.exec(`UPDATE auth.identities SET identity_data='{"email":"client@example.test","email_verified":true}' WHERE user_id='${uid}';SELECT set_config('request.admin','false',false);SELECT set_config('request.jwt','{"mf_google_session":true}',false);SET ROLE authenticated;`);
const own=(await db.query('select * from public.mesa_dados')).rows;
assert.equal(own.length,1);assert.equal(own[0].dados.balance,123);console.log('PASS: authorized client cannot read other client data');
await db.exec(`RESET ROLE;DELETE FROM public.mf_google_allowlist;SET ROLE authenticated;`);
assert.equal((await db.query('select * from public.mesa_dados')).rows.length,0);console.log('PASS: revocation blocks existing Google token reads');
await assert.rejects(()=>db.exec(`INSERT INTO public.mesa_dados VALUES('${uid}','{}')`),/row-level security/);console.log('PASS: revocation blocks existing Google token writes');
await db.exec(`RESET ROLE;`);
assert.equal((await hook('token_refresh',{mf_google_session:true})).error.http_code,403);console.log('PASS: revoked Google session refresh denied');
assert.equal((await hook('token_refresh',{amr:[{method:'password'}]})).claims.mf_google_session,false);console.log('PASS: password-session refresh preserved after revocation');
assert.equal((await db.query('select count(*)::int as n from public.mf_profiles')).rows[0].n,2);
await db.exec(`INSERT INTO auth.users(id,email) VALUES('00000000-0000-0000-0000-000000000003','new@example.test')`);
assert.equal((await db.query('select count(*)::int as n from public.mf_profiles')).rows[0].n,3);console.log('PASS: existing and new accounts receive profiles');
await db.close();
