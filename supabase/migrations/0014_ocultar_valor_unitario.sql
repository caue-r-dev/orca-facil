alter table orcamentos
  add column ocultar_valor_unitario boolean not null default false;

notify pgrst, 'reload schema';
