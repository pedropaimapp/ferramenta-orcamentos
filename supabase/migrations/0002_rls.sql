create function is_admin() returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from consultores
    where auth_user_id = auth.uid() and papel = 'admin' and ativo = true
  );
$$;

create function current_consultor_id() returns uuid
language sql security definer stable
as $$
  select id from consultores where auth_user_id = auth.uid();
$$;

alter table oficinas enable row level security;
create policy "oficinas: leitura para autenticados" on oficinas for select using (auth.uid() is not null);
create policy "oficinas: escrita só admin" on oficinas for insert with check (is_admin());
create policy "oficinas: update só admin" on oficinas for update using (is_admin());
create policy "oficinas: delete só admin" on oficinas for delete using (is_admin());

alter table consultores enable row level security;
create policy "consultores: vê a si mesmo, admin vê todos" on consultores for select
  using (auth_user_id = auth.uid() or is_admin());
create policy "consultores: só admin cadastra" on consultores for insert with check (is_admin());
create policy "consultores: só admin atualiza" on consultores for update using (is_admin());

alter table catalogo_itens enable row level security;
create policy "catalogo: leitura para autenticados" on catalogo_itens for select using (auth.uid() is not null);
create policy "catalogo: só admin insere" on catalogo_itens for insert with check (is_admin());
create policy "catalogo: só admin atualiza" on catalogo_itens for update using (is_admin());
create policy "catalogo: só admin remove" on catalogo_itens for delete using (is_admin());

alter table faixas_pagamento enable row level security;
create policy "faixas: leitura para autenticados" on faixas_pagamento for select using (auth.uid() is not null);
create policy "faixas: só admin insere" on faixas_pagamento for insert with check (is_admin());
create policy "faixas: só admin atualiza" on faixas_pagamento for update using (is_admin());
create policy "faixas: só admin remove" on faixas_pagamento for delete using (is_admin());

alter table configuracao_pagamento enable row level security;
create policy "configuracao: leitura para autenticados" on configuracao_pagamento for select using (auth.uid() is not null);
create policy "configuracao: só admin atualiza" on configuracao_pagamento for update using (is_admin());

alter table orcamentos enable row level security;
create policy "orcamentos: consultor vê e edita os próprios, admin vê todos" on orcamentos for all
  using (consultor_id = current_consultor_id() or is_admin())
  with check (consultor_id = current_consultor_id() or is_admin());

alter table orcamento_itens enable row level security;
create policy "orcamento_itens: segue o orçamento pai" on orcamento_itens for all
  using (exists (
    select 1 from orcamentos o
    where o.id = orcamento_id and (o.consultor_id = current_consultor_id() or is_admin())
  ))
  with check (exists (
    select 1 from orcamentos o
    where o.id = orcamento_id and (o.consultor_id = current_consultor_id() or is_admin())
  ));
