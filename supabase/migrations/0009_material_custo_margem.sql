-- Itens de categoria "material" na biblioteca passam a guardar custo de
-- aquisição + margem separadamente, além do valor_unit_padrao (que
-- continua sendo o preço de venda calculado: custo × (1 + margem/100)).
-- Itens de categoria "mão de obra" não usam essas colunas (ficam null).
-- valor_unit_padrao segue sendo a fonte de verdade lida em todo lugar
-- que consome a biblioteca (Ambiente, itens de orçamento) — só a forma
-- de preenchê-lo muda para material.

alter table itens_biblioteca_empresa
  add column custo_aquisicao numeric,
  add column margem_percentual numeric;
