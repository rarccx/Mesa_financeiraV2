-- =====================================================================
-- Mesa Financeira - reforço de segurança do banco (regras de acesso)
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- Pode rodar mais de uma vez: remove e recria as regras abaixo.
-- Pré-requisito: a função public.sou_admin() já existente no seu projeto
-- (o app já a usa). Faça um backup antes (Database > Backups).
-- =====================================================================

-- 1) Dados financeiros: cada usuário só vê e altera os próprios
alter table public.mesa_dados enable row level security;
drop policy if exists mf_dados_sel on public.mesa_dados;
drop policy if exists mf_dados_ins on public.mesa_dados;
drop policy if exists mf_dados_upd on public.mesa_dados;
drop policy if exists mf_dados_del on public.mesa_dados;
create policy mf_dados_sel on public.mesa_dados for select to authenticated using (user_id = auth.uid());
create policy mf_dados_ins on public.mesa_dados for insert to authenticated with check (user_id = auth.uid());
create policy mf_dados_upd on public.mesa_dados for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy mf_dados_del on public.mesa_dados for delete to authenticated using (user_id = auth.uid());

-- 2) Lembretes por SMS: só os próprios
alter table public.lembretes_sms enable row level security;
drop policy if exists mf_sms_all on public.lembretes_sms;
create policy mf_sms_all on public.lembretes_sms for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3) Planos: o cliente só LÊ o próprio plano. Mudanças só pelo admin (função admin_definir_plano)
alter table public.planos enable row level security;
drop policy if exists mf_planos_sel on public.planos;
drop policy if exists mf_planos_admin on public.planos;
create policy mf_planos_sel on public.planos for select to authenticated using (user_id = auth.uid() or public.sou_admin());
create policy mf_planos_admin on public.planos for all to authenticated using (public.sou_admin()) with check (public.sou_admin());

-- 4) Módulos liberados por usuário: cliente lê os seus; só admin altera
alter table public.modulos_usuario enable row level security;
drop policy if exists mf_mod_sel on public.modulos_usuario;
drop policy if exists mf_mod_admin on public.modulos_usuario;
create policy mf_mod_sel on public.modulos_usuario for select to authenticated using (user_id = auth.uid() or public.sou_admin());
create policy mf_mod_admin on public.modulos_usuario for all to authenticated using (public.sou_admin()) with check (public.sou_admin());

-- 5) Módulos por plano: todos logados leem; só admin altera
alter table public.config_modulos_plano enable row level security;
drop policy if exists mf_cfg_sel on public.config_modulos_plano;
drop policy if exists mf_cfg_admin on public.config_modulos_plano;
create policy mf_cfg_sel on public.config_modulos_plano for select to authenticated using (true);
create policy mf_cfg_admin on public.config_modulos_plano for all to authenticated using (public.sou_admin()) with check (public.sou_admin());

-- 6) Visitantes sem login não acessam nenhuma tabela
revoke all on public.mesa_dados, public.lembretes_sms, public.planos,
  public.modulos_usuario, public.config_modulos_plano from anon;

-- 7) Comprovantes (arquivos): pasta privada, cada usuário só acessa a pasta com o próprio id
update storage.buckets set public = false where id = 'comprovantes';
drop policy if exists mf_comp_sel on storage.objects;
drop policy if exists mf_comp_ins on storage.objects;
drop policy if exists mf_comp_del on storage.objects;
create policy mf_comp_sel on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy mf_comp_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy mf_comp_del on storage.objects for delete to authenticated
  using (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);

-- 8) Conferência: lista tabelas públicas que ainda estão SEM regra de acesso ligada
select tablename from pg_tables where schemaname = 'public' and rowsecurity = false;
