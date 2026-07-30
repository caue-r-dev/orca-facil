-- valor_customizado: quando preenchido, é o valor final da linha (em vez
-- de quantidade*valor_unit+valor_material) — override manual do usuário
-- pra ESSE orçamento específico. NULL = comportamento atual (calculado).
-- Nunca sobrescrito por recálculo de medida do ambiente (só quantidade
-- muda em atualizarAmbiente, nunca valor_customizado) e nunca escreve de
-- volta no preço-base da biblioteca (itens_biblioteca_empresa).
--
-- observacoes: texto livre opcional por item, aparece na proposta/PDF
-- junto da descrição do serviço. Não reaproveita a coluna "descricao"
-- já existente porque ela já serve de nome do serviço.
alter table itens_orcamento
  add column valor_customizado numeric null,
  add column observacoes text null;

notify pgrst, 'reload schema';
