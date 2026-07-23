export type SegmentoKey = 'eletrica' | 'hidraulica' | 'construcao' | 'drywall' | 'geral'
export type Categoria = 'material' | 'mao_obra'
export type OrcamentoStatus = 'rascunho' | 'enviado'
export type ModoMedicao = 'manual' | 'metro_linear' | 'metro_quadrado'

export interface Empresa {
  id: string
  nome: string
  segmento_padrao: SegmentoKey
  telefone: string | null
  logo_url: string | null
  bdi_padrao: number
  created_at: string
}

export interface Usuario {
  id: string
  empresa_id: string
  nome: string
  created_at: string
}

export interface Orcamento {
  id: string
  empresa_id: string
  cliente_nome: string
  cliente_contato: string | null
  obra_endereco: string | null
  prazo_execucao: string | null
  validade_dias: number
  forma_pagamento: string | null
  bdi: number
  status: OrcamentoStatus
  created_at: string
  updated_at: string
}

export interface ItemOrcamento {
  id: string
  orcamento_id: string
  descricao: string
  categoria: Categoria
  unidade: string
  modo_medicao: ModoMedicao
  comprimento: number | null
  altura: number | null
  quantidade: number
  valor_unit: number
}

export interface ItemBiblioteca {
  id: string
  empresa_id: string
  descricao: string
  categoria: Categoria
  unidade: string
  valor_unit_padrao: number
  created_at: string
}
