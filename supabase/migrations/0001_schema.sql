create table oficinas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text not null,
  telefone text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

create table consultores (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  nome text not null,
  login text not null unique,
  papel text not null check (papel in ('consultor', 'admin')),
  oficina_id uuid references oficinas(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table catalogo_itens (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  tipo text not null check (tipo in ('peca', 'servico')),
  marca_codigo text,
  valor_padrao_centavos integer not null default 0,
  created_at timestamptz not null default now()
);

create table faixas_pagamento (
  id uuid primary key default gen_random_uuid(),
  valor_min_centavos integer not null,
  valor_max_centavos integer,
  parcelas_sem_juros integer not null check (parcelas_sem_juros > 0),
  created_at timestamptz not null default now()
);

create table configuracao_pagamento (
  id integer primary key default 1,
  percentual_entrada_minima numeric(4,3) not null default 0.300,
  percentual_desconto_avista numeric(4,3) not null default 0.050,
  cartao_porto_max_parcelas integer not null default 6,
  cartao_porto_parcela_minima_centavos integer not null default 10000,
  updated_at timestamptz not null default now(),
  constraint configuracao_pagamento_singleton check (id = 1)
);

create table orcamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text not null,
  cliente_telefone text not null,
  veiculo_placa text not null,
  veiculo_modelo text not null,
  consultor_id uuid not null references consultores(id),
  oficina_id uuid not null references oficinas(id),
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  validade_dias integer not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  catalogo_item_id uuid references catalogo_itens(id),
  descricao text not null,
  tipo text not null check (tipo in ('peca', 'servico')),
  quantidade integer not null check (quantidade > 0),
  valor_unitario_centavos integer not null check (valor_unitario_centavos >= 0)
);
