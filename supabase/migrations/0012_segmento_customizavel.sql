-- Segmento deixa de ser um enum fechado — empresas.segmento_padrao já
-- era texto livre (sem CHECK constraint desde a migração 0001), então
-- nenhuma mudança de schema é necessária aí; o admin agora pode
-- digitar qualquer nome além dos 4 presets.
--
-- O comportamento de pé-direito/área de parede no Ambiente deixa de
-- ser inferido do nome do segmento ("drywall"/"construção" fixos) e
-- vira um campo explícito, decidido pelo admin ao cadastrar a conta.
-- Backfill automático: empresas já cadastradas com os presets antigos
-- mantêm o comportamento de hoje sem nenhuma ação manual — Drywall e
-- Construção ligam tem_parede, os demais ficam desligados (default).

alter table empresas add column tem_parede boolean not null default false;

update empresas set tem_parede = true where segmento_padrao in ('drywall', 'construcao');
