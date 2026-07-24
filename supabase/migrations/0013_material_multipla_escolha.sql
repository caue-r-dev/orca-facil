-- Alguns serviços usam mais de um material simultaneamente (ex:
-- Execução de Estrutura em Drywall usa Guia + Montante + Placa ST ao
-- mesmo tempo). material_item_id (uuid único) não suporta isso — vira
-- material_item_ids (uuid[]). Coluna antiga fica sem uso, nunca
-- removida (schema aditivo, mesmo padrão de 0004/0007/0008), e serve
-- de fallback de leitura pra orçamentos salvos antes desta migração.
--
-- valor_material passa a ser a SOMA dos valor_unit_padrao de todos os
-- materiais escolhidos (antes era o valor de um único material) — sem
-- multiplicar por quantidade/área/perímetro, ao contrário da mão de
-- obra. O nome da coluna não muda, só o que ela representa.

alter table itens_orcamento
  add column material_item_ids uuid[] not null default '{}';

update itens_orcamento
set material_item_ids = array[material_item_id]
where material_item_id is not null;
