-- chapeamento_duplo: quando true, a área de parede usada no cálculo
-- desse item específico (medida "Área de parede") é dobrada, refletindo
-- material/mão de obra que cobre os dois lados da parede (drywall).
-- Só faz sentido pra itens com origem_ambiente = 'area_parede'; nos
-- demais fica false e não afeta nada.
alter table itens_orcamento
  add column chapeamento_duplo boolean not null default false;

notify pgrst, 'reload schema';
