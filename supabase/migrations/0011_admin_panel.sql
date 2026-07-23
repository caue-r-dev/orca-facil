-- Painel de admin: usuários passam a ter um role ('prestador' padrão,
-- 'admin' pro dono do SaaS). Admin não pertence a nenhuma empresa —
-- empresa_id vira opcional só pra esse caso.
--
-- empresas.ativo controla bloqueio de acesso: login verifica esse
-- campo e recusa entrar (com signOut) se a empresa estiver bloqueada,
-- em vez de uma policy RLS por tabela (mais simples, mesmo efeito
-- prático já que é checado antes de qualquer outra ação).
--
-- eventos_uso registra login e criação de orçamento por empresa, pra
-- o admin ver frequência de uso (último acesso, contagem de
-- orçamentos). Insert liberado pro próprio prestador logar eventos da
-- própria empresa; select só via service role (admin).

alter table usuarios alter column empresa_id drop not null;
alter table usuarios add column role text not null default 'prestador' check (role in ('prestador', 'admin'));

alter table empresas add column ativo boolean not null default true;

-- Vencimento de assinatura: passou da data sem renovação, login já
-- bloqueia sozinho (checado junto com "ativo" na hora de entrar) —
-- sem precisar o admin bloquear manualmente. "Renovar acesso" empurra
-- essa data pra frente e liga "ativo" de novo, cobrindo tanto bloqueio
-- automático por vencimento quanto manual.
alter table empresas add column data_vencimento date not null default (current_date + interval '30 days');

create table eventos_uso (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  tipo_evento text not null check (tipo_evento in ('login', 'orcamento_criado')),
  created_at timestamptz not null default now()
);

alter table eventos_uso enable row level security;

create policy "eventos_uso_insert_own" on eventos_uso
  for insert to authenticated with check (empresa_id = auth_empresa_id());

-- auth_empresa_id() resolves to null for admin users (no empresa), and
-- "empresa_id = null" is never true in SQL — so the existing
-- usuarios_select_own policy can't even let an admin read their own
-- row. Add a self-lookup policy that works regardless of empresa_id.
create policy "usuarios_select_self" on usuarios
  for select to authenticated using (id = auth.uid());
