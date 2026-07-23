import type { ItemOrcamento } from './types'

export interface ResultadoCalculo {
  subtotalMaterial: number
  subtotalMaoObra: number
  subtotal: number
  total: number
}

// Sem BDI: mão de obra já é o valor final decidido pelo prestador, e
// material já embute sua própria margem (custo + %) — aplicar um
// percentual por cima do total duplicaria a margem. Total = soma direta.
export function calcularOrcamento(
  itens: Pick<ItemOrcamento, 'categoria' | 'quantidade' | 'valor_unit'>[]
): ResultadoCalculo {
  let subtotalMaterial = 0
  let subtotalMaoObra = 0
  for (const item of itens) {
    const valor = (Number(item.quantidade) || 0) * (Number(item.valor_unit) || 0)
    if (item.categoria === 'material') subtotalMaterial += valor
    else subtotalMaoObra += valor
  }
  const subtotal = subtotalMaterial + subtotalMaoObra
  return { subtotalMaterial, subtotalMaoObra, subtotal, total: subtotal }
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
