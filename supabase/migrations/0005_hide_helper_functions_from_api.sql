-- Moves is_admin()/current_consultor_id() into a non-exposed "private" schema so they can
-- no longer be called directly via PostgREST's auto-generated RPC endpoints
-- (/rest/v1/rpc/is_admin, /rest/v1/rpc/current_consultor_id). RLS policies still work
-- unchanged: Postgres resolves schema-qualified function calls independent of PostgREST's
-- exposed-schema config, and both functions keep EXECUTE granted to authenticated/anon.
create schema if not exists private;

create function private.is_admin() returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from consultores
    where auth_user_id = auth.uid() and papel = 'admin' and ativo = true
  );
$$;

create function private.current_consultor_id() returns uuid
language sql security definer stable
set search_path = public
as $$
  select id from consultores where auth_user_id = auth.uid() and ativo = true;
$$;

grant usage on schema private to authenticated, anon;
grant execute on function private.is_admin() to authenticated, anon;
grant execute on function private.current_consultor_id() to authenticated, anon;

drop policy "oficinas: escrita só admin" on oficinas;
drop policy "oficinas: update só admin" on oficinas;
drop policy "oficinas: delete só admin" on oficinas;
drop policy "consultores: vê a si mesmo, admin vê todos" on consultores;
drop policy "consultores: só admin cadastra" on consultores;
drop policy "consultores: só admin atualiza" on consultores;
drop policy "catalogo: só admin insere" on catalogo_itens;
drop policy "catalogo: só admin atualiza" on catalogo_itens;
drop policy "catalogo: só admin remove" on catalogo_itens;
drop policy "faixas: só admin insere" on faixas_pagamento;
drop policy "faixas: só admin atualiza" on faixas_pagamento;
drop policy "faixas: só admin remove" on faixas_pagamento;
drop policy "configuracao: só admin atualiza" on configuracao_pagamento;
drop policy "orcamentos: consultor vê e edita os próprios, admin vê todos" on orcamentos;
drop policy "orcamento_itens: segue o orçamento pai" on orcamento_itens;
drop policy "logos: só admin envia" on storage.objects;
drop policy "logos: só admin atualiza" on storage.objects;

drop function public.is_admin();
drop function public.current_consultor_id();

create policy "oficinas: escrita só admin" on oficinas for insert with check (private.is_admin());
create policy "oficinas: update só admin" on oficinas for update using (private.is_admin());
create policy "oficinas: delete só admin" on oficinas for delete using (private.is_admin());

create policy "consultores: vê a si mesmo, admin vê todos" on consultores for select
  using (auth_user_id = auth.uid() or private.is_admin());
create policy "consultores: só admin cadastra" on consultores for insert with check (private.is_admin());
create policy "consultores: só admin atualiza" on consultores for update using (private.is_admin());

create policy "catalogo: só admin insere" on catalogo_itens for insert with check (private.is_admin());
create policy "catalogo: só admin atualiza" on catalogo_itens for update using (private.is_admin());
create policy "catalogo: só admin remove" on catalogo_itens for delete using (private.is_admin());

create policy "faixas: só admin insere" on faixas_pagamento for insert with check (private.is_admin());
create policy "faixas: só admin atualiza" on faixas_pagamento for update using (private.is_admin());
create policy "faixas: só admin remove" on faixas_pagamento for delete using (private.is_admin());

create policy "configuracao: só admin atualiza" on configuracao_pagamento for update using (private.is_admin());

create policy "orcamentos: consultor vê e edita os próprios, admin vê todos" on orcamentos for all
  using (consultor_id = private.current_consultor_id() or private.is_admin())
  with check (consultor_id = private.current_consultor_id() or private.is_admin());

create policy "orcamento_itens: segue o orçamento pai" on orcamento_itens for all
  using (exists (
    select 1 from orcamentos o
    where o.id = orcamento_id and (o.consultor_id = private.current_consultor_id() or private.is_admin())
  ))
  with check (exists (
    select 1 from orcamentos o
    where o.id = orcamento_id and (o.consultor_id = private.current_consultor_id() or private.is_admin())
  ));

create policy "logos: só admin envia" on storage.objects for insert with check (bucket_id = 'logos' and private.is_admin());
create policy "logos: só admin atualiza" on storage.objects for update using (bucket_id = 'logos' and private.is_admin());
