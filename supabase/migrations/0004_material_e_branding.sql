-- Two additions:
-- 1. "Material por conta do prestador" per ambiente service (chapeamento,
--    forro): mão de obra and material R$/m² are tracked separately so
--    editing later restores the exact breakdown, but they're combined
--    into a single valor_unit on the generated item — the client-facing
--    orçamento/PDF never shows a material+mão-de-obra split per line
--    (same pattern as the Belini reference system).
-- 2. cor_primaria on empresas for public-page/PDF branding. Default
--    matches the current blueprint-deep prototype color so existing
--    empresas render identically until they customize it.

alter table ambientes_orcamento
  add column valor_mao_obra_chapeamento numeric not null default 0,
  add column material_chapeamento boolean not null default false,
  add column valor_material_chapeamento numeric not null default 0,
  add column valor_mao_obra_forro numeric not null default 0,
  add column material_forro boolean not null default false,
  add column valor_material_forro numeric not null default 0;

alter table empresas
  add column cor_primaria text not null default '#1F3540';
