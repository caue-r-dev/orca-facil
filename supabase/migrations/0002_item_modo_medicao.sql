-- Adds per-item measurement mode: prestador picks how quantidade is
-- derived instead of always typing it in free-form.
--   manual         -> quantidade typed directly (unchanged behavior)
--   metro_linear   -> quantidade = comprimento
--   metro_quadrado -> quantidade = comprimento * altura
-- Additive only: existing rows default to 'manual' with null medidas,
-- which reproduces today's behavior exactly.

alter table itens_orcamento
  add column modo_medicao text not null default 'manual'
    check (modo_medicao in ('manual', 'metro_linear', 'metro_quadrado')),
  add column comprimento numeric,
  add column altura numeric;
