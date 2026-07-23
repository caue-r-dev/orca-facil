-- Adds "Ambiente (cômodo)" support: prestador enters room dimensions
-- once (comprimento/largura/pé-direito, chapeamento simples/duplo,
-- forro sim/não) and chapeamento/forro items are derived from it.
-- itens_orcamento.ambiente_id links generated items back to their
-- ambiente so edits to the ambiente can recompute them instead of
-- requiring a manual delete-and-redo.

create table ambientes_orcamento (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  nome text not null,
  comprimento numeric not null default 0,
  largura numeric not null default 0,
  pe_direito numeric not null default 0,
  chapeamento text not null default 'simples' check (chapeamento in ('simples', 'duplo')),
  forro boolean not null default false,
  created_at timestamptz not null default now()
);

alter table ambientes_orcamento enable row level security;

create policy "ambientes_orcamento_all_own" on ambientes_orcamento
  for all to authenticated
  using (orcamento_id in (select id from orcamentos where empresa_id = auth_empresa_id()));

alter table itens_orcamento
  add column ambiente_id uuid references ambientes_orcamento(id) on delete cascade,
  add column origem_ambiente text check (origem_ambiente in ('chapeamento', 'forro'));
