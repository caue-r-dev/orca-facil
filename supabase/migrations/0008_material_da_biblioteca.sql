-- Material "por conta do prestador" no Ambiente deixa de ser um custo de
-- lote digitado ali (migração 0007) e passa a ser escolhido a partir dos
-- itens de categoria "material" já cadastrados na biblioteca da empresa.
-- valor_material_chapeamento/valor_material_forro (migração 0004) voltam
-- a ser a fonte de verdade do valor por m², agora como snapshot do
-- valor_unit_padrao do item escolhido no momento da seleção. As colunas
-- custo_lote_*/rendimento_lote_* (migração 0007) ficam sem uso — nunca
-- removidas (schema aditivo).

alter table ambientes_orcamento
  add column material_item_id_chapeamento uuid references itens_biblioteca_empresa(id) on delete set null,
  add column material_item_id_forro uuid references itens_biblioteca_empresa(id) on delete set null;
