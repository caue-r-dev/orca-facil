import type { SegmentoKey, Categoria } from './types'

export interface ItemSeed {
  descricao: string
  unidade: string
  valorUnitPadrao: number
  categoria: Categoria
}

export interface SegmentoSeed {
  label: string
  bdiPadrao: number
  itens: ItemSeed[]
}

export const SEGMENTOS: Record<SegmentoKey, SegmentoSeed> = {
  eletrica: {
    label: 'Elétrica',
    bdiPadrao: 25,
    itens: [
      { descricao: 'Ponto de tomada', unidade: 'un', valorUnitPadrao: 85, categoria: 'mao_obra' },
      { descricao: 'Ponto de luz', unidade: 'un', valorUnitPadrao: 90, categoria: 'mao_obra' },
      { descricao: 'Troca de disjuntor', unidade: 'un', valorUnitPadrao: 60, categoria: 'mao_obra' },
      { descricao: 'Fiação elétrica 2,5mm', unidade: 'm', valorUnitPadrao: 6.5, categoria: 'material' },
      { descricao: 'Quadro de distribuição', unidade: 'un', valorUnitPadrao: 320, categoria: 'material' },
      { descricao: 'Hora técnica eletricista', unidade: 'h', valorUnitPadrao: 75, categoria: 'mao_obra' },
    ],
  },
  hidraulica: {
    label: 'Hidráulica',
    bdiPadrao: 25,
    itens: [
      { descricao: 'Ponto de água', unidade: 'un', valorUnitPadrao: 95, categoria: 'mao_obra' },
      { descricao: 'Ponto de esgoto', unidade: 'un', valorUnitPadrao: 110, categoria: 'mao_obra' },
      { descricao: 'Troca de registro', unidade: 'un', valorUnitPadrao: 70, categoria: 'mao_obra' },
      { descricao: 'Instalação de vaso sanitário', unidade: 'un', valorUnitPadrao: 180, categoria: 'mao_obra' },
      { descricao: 'Tubulação PVC 25mm', unidade: 'm', valorUnitPadrao: 14, categoria: 'material' },
      { descricao: 'Hora técnica encanador', unidade: 'h', valorUnitPadrao: 75, categoria: 'mao_obra' },
    ],
  },
  construcao: {
    label: 'Pedreiro / Construção',
    bdiPadrao: 22,
    itens: [
      { descricao: 'Levantamento de parede', unidade: 'm²', valorUnitPadrao: 65, categoria: 'mao_obra' },
      { descricao: 'Reboco', unidade: 'm²', valorUnitPadrao: 38, categoria: 'mao_obra' },
      { descricao: 'Contrapiso', unidade: 'm²', valorUnitPadrao: 42, categoria: 'mao_obra' },
      { descricao: 'Concretagem', unidade: 'm³', valorUnitPadrao: 480, categoria: 'material' },
      { descricao: 'Hora pedreiro', unidade: 'h', valorUnitPadrao: 55, categoria: 'mao_obra' },
      { descricao: 'Hora ajudante', unidade: 'h', valorUnitPadrao: 35, categoria: 'mao_obra' },
    ],
  },
  drywall: {
    label: 'Drywall',
    bdiPadrao: 24,
    itens: [
      { descricao: 'Placa de drywall', unidade: 'm²', valorUnitPadrao: 48, categoria: 'material' },
      { descricao: 'Estrutura metálica', unidade: 'm²', valorUnitPadrao: 32, categoria: 'material' },
      { descricao: 'Isolamento acústico', unidade: 'm²', valorUnitPadrao: 18, categoria: 'material' },
      { descricao: 'Acabamento / massa corrida', unidade: 'm²', valorUnitPadrao: 22, categoria: 'mao_obra' },
      { descricao: 'Hora técnica drywall', unidade: 'h', valorUnitPadrao: 65, categoria: 'mao_obra' },
    ],
  },
  geral: {
    label: 'Outro serviço',
    bdiPadrao: 25,
    itens: [],
  },
}
