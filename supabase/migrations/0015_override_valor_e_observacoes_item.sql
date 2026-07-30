alter table itens_orcamento
  add column valor_customizado numeric,
  add column observacoes text;

notify pgrst, 'reload schema';
