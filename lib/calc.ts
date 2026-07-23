import type { ItemOrcamento } from './types'

export interface ResultadoCalculo {
  subtotalMaterial: number
  subtotalMaoObra: number
  subtotal: number
  valorBdi: number
  total: number
}

export function calcularOrcamento(
  itens: Pick<ItemOrcamento, 'categoria' | 'quantidade' | 'valor_unit'>[],
  bdi: number
): ResultadoCalculo {
  let subtotalMaterial = 0
  let subtotalMaoObra = 0
  for (const item of itens) {
    const valor = (Number(item.quantidade) || 0) * (Number(item.valor_unit) || 0)
    if (item.categoria === 'material') subtotalMaterial += valor
    else subtotalMaoObra += valor
  }
  const subtotal = subtotalMaterial + subtotalMaoObra
  const valorBdi = subtotal * ((Number(bdi) || 0) / 100)
  return { subtotalMaterial, subtotalMaoObra, subtotal, valorBdi, total: subtotal + valorBdi }
}

export function formatarMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
