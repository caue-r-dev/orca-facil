-- Cadastro now collects CNPJ up front, alongside the fields already on
-- empresas (nome, telefone). Nullable: existing empresas predate this
-- field and have none.

alter table empresas
  add column cnpj text;
