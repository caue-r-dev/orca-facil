import type { ItemOrcamento } from './types'

export interface ResultadoCalculo {
  subtotalMaterial: number
  subtotalMaoObra: number
  subtotal: number
  total: number
}

// Valor final de UM item: se valor_customizado foi definido (override
// manual do usuário nesse orçamento específico), ele é o valor final e
// ignora quantidade/valor_unit/valor_material. Caso contrário, segue o
// cálculo normal. Única fonte de verdade pro valor de um item — usada
// aqui, no total por ambiente (OrcamentoBuilder) e na proposta/PDF
// (OrcamentoPreview), pra nunca haver 3 fórmulas divergentes.
export function valorFinalItem(
  item: Pick<ItemOrcamento, 'quantidade' | 'valor_unit' | 'valor_material' | 'valor_customizado'>
): number {
  if (item.valor_customizado !== null && item.valor_customizado !== undefined) {
    return Number(item.valor_customizado) || 0
  }
  return (Number(item.quantidade) || 0) * (Number(item.valor_unit) || 0) + (Number(item.valor_material) || 0)
}

// Sem BDI: mão de obra já é o valor final decidido pelo prestador, e
// material já embute sua própria margem (custo + %) — aplicar um
// percentual por cima do total duplicaria a margem. Total = soma direta.
export function calcularOrcamento(
  itens: Pick<ItemOrcamento, 'categoria' | 'quantidade' | 'valor_unit' | 'valor_material' | 'valor_customizado'>[]
): ResultadoCalculo {
  let subtotalMaterial = 0
  let subtotalMaoObra = 0
  for (const item of itens) {
    const valor = valorFinalItem(item)
    if (item.categoria === 'material') subtotalMaterial += valor
    else subtotalMaoObra += valor
  }
  const subtotal = subtotalMaterial + subtotalMaoObra
  return { subtotalMaterial, subtotalMaoObra, subtotal, total: subtotal }
}

// Itens de ambiente nascem como "Serviço — Nome do Ambiente" (ver
// adicionarServicoAoAmbiente em OrcamentoBuilder). Usado pra listar só
// o nome do serviço sem repetir o ambiente já indicado na própria linha.
export function nomeServicoSemAmbiente(descricao: string): string {
  return descricao.split(' — ')[0]
}

export function formatarMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Preço de venda de material = custo de aquisição + margem do prestador
// em cima desse custo. Vale para qualquer segmento (não só drywall).
export function calcularValorVendaMaterial(custoAquisicao: number, margemPercentual: number): number {
  const valor = (Number(custoAquisicao) || 0) * (1 + (Number(margemPercentual) || 0) / 100)
  return Math.round(valor * 100) / 100
}
