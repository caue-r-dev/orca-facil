-- Ambiente deixa de ser exclusivo de drywall com campos fixos
-- Chapeamento/Forro. Vira um mecanismo genérico pra qualquer segmento:
-- o prestador mede o ambiente (comprimento/largura, e pé-direito quando
-- o segmento trabalha com parede), o sistema calcula Perímetro/Área/
-- Área de parede, e o prestador adiciona quantos serviços quiser da
-- própria biblioteca, escolhendo qual medida vira a quantidade de cada
-- um.
--
-- origem_ambiente passa a guardar a medida usada ('perimetro', 'area',
-- 'area_parede') em vez de 'chapeamento'/'forro' fixos — a constraint é
-- ampliada (não trocada) pra manter linhas antigas válidas. As colunas
-- antigas de ambientes_orcamento (chapeamento, forro, valor_mao_obra_*,
-- material_*, material_item_id_*, valor_material_*) ficam sem uso —
-- nunca removidas (schema aditivo).
--
-- material_item_id/valor_material entram em itens_orcamento (não mais
-- em ambientes_orcamento) porque agora cada serviço adicionado ao
-- ambiente pode ter seu próprio material opcional, não um slot fixo
-- por ambiente.

alter table itens_orcamento drop constraint if exists itens_orcamento_origem_ambiente_check;
alter table itens_orcamento add constraint itens_orcamento_origem_ambiente_check
  check (origem_ambiente in ('chapeamento', 'forro', 'perimetro', 'area', 'area_parede'));

alter table itens_orcamento
  add column material_item_id uuid references itens_biblioteca_empresa(id) on delete set null,
  add column valor_material numeric not null default 0;
