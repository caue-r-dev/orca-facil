export type SegmentoKey = 'eletrica' | 'hidraulica' | 'construcao' | 'drywall' | 'geral'
export type Categoria = 'material' | 'mao_obra'
export type OrcamentoStatus = 'rascunho' | 'enviado'
export type ModoMedicao = 'manual' | 'metro_linear' | 'metro_quadrado'
export type MedidaAmbiente = 'perimetro' | 'area' | 'area_parede'
// 'chapeamento'/'forro' são valores legados (pré Ambiente universal),
// ainda válidos no banco pra não quebrar orçamentos antigos.
export type OrigemAmbiente = MedidaAmbiente | 'chapeamento' | 'forro'

export interface Empresa {
  id: string
  nome: string
  cnpj: string | null
  segmento_padrao: SegmentoKey
  telefone: string | null
  logo_url: string | null
  cor_primaria: string
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
  ambiente_id: string | null
  origem_ambiente: OrigemAmbiente | null
  material_item_id: string | null
  valor_material: number
}

export interface AmbienteOrcamento {
  id: string
  orcamento_id: string
  nome: string
  comprimento: number
  largura: number
  pe_direito: number
  created_at: string
}

export interface ItemBiblioteca {
  id: string
  empresa_id: string
  descricao: string
  categoria: Categoria
  unidade: string
  valor_unit_padrao: number
  custo_aquisicao: number | null
  margem_percentual: number | null
  created_at: string
}
