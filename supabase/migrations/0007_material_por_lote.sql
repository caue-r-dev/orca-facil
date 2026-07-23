-- Material "por conta do prestador" agora é diluído por lote: o
-- prestador informa custo do lote/pacote comprado (R$) e rendimento
-- do lote (m² cobertos); valor por m² = custo ÷ rendimento. As colunas
-- valor_material_chapeamento/valor_material_forro (migração 0004)
-- ficam sem uso — nunca removidas (schema aditivo), só substituídas
-- como fonte de verdade pelo cálculo em cima do lote.

alter table ambientes_orcamento
  add column custo_lote_chapeamento numeric not null default 0,
  add column rendimento_lote_chapeamento numeric not null default 0,
  add column custo_lote_forro numeric not null default 0,
  add column rendimento_lote_forro numeric not null default 0;
