create table empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  segmento_padrao text not null,
  telefone text,
  logo_url text,
  bdi_padrao numeric not null default 25,
  created_at timestamptz not null default now()
);

create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

create table orcamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  cliente_nome text not null,
  cliente_contato text,
  obra_endereco text,
  prazo_execucao text,
  validade_dias integer not null default 7,
  forma_pagamento text,
  bdi numeric not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table itens_orcamento (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  descricao text not null,
  categoria text not null check (categoria in ('material', 'mao_obra')),
  unidade text not null,
  quantidade numeric not null default 1,
  valor_unit numeric not null default 0
);

create table itens_biblioteca_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  descricao text not null,
  categoria text not null check (categoria in ('material', 'mao_obra')),
  unidade text not null,
  valor_unit_padrao numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table empresas enable row level security;
alter table usuarios enable row level security;
alter table orcamentos enable row level security;
alter table itens_orcamento enable row level security;
alter table itens_biblioteca_empresa enable row level security;

-- Resolves the empresa_id of the currently authenticated user via the bridge table.
create or replace function auth_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from usuarios where id = auth.uid()
$$;

create policy "empresas_insert_authenticated" on empresas
  for insert to authenticated with check (true);
create policy "empresas_select_own" on empresas
  for select to authenticated using (id = auth_empresa_id());
create policy "empresas_update_own" on empresas
  for update to authenticated using (id = auth_empresa_id());

create policy "usuarios_insert_self" on usuarios
  for insert to authenticated with check (id = auth.uid());
create policy "usuarios_select_own" on usuarios
  for select to authenticated using (empresa_id = auth_empresa_id());

create policy "orcamentos_all_own" on orcamentos
  for all to authenticated
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

create policy "itens_orcamento_all_own" on itens_orcamento
  for all to authenticated
  using (orcamento_id in (select id from orcamentos where empresa_id = auth_empresa_id()))
  with check (orcamento_id in (select id from orcamentos where empresa_id = auth_empresa_id()));

create policy "biblioteca_all_own" on itens_biblioteca_empresa
  for all to authenticated
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());
