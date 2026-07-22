import { describe, it, expect } from 'vitest'
import { calcularOrcamento, formatarMoeda } from './calc'
import type { ItemOrcamento } from './types'

const item = (categoria: 'material' | 'mao_obra', quantidade: number, valor_unit: number): ItemOrcamento => ({
  id: 'x', orcamento_id: 'o', descricao: 'd', categoria, unidade: 'un', quantidade, valor_unit,
})

describe('calcularOrcamento', () => {
  it('splits material and mao_obra subtotals and applies BDI on top of the sum', () => {
    const itens = [item('material', 2, 100), item('mao_obra', 3, 50)]
    const result = calcularOrcamento(itens, 25)
    expect(result.subtotalMaterial).toBe(200)
    expect(result.subtotalMaoObra).toBe(150)
    expect(result.subtotal).toBe(350)
    expect(result.valorBdi).toBe(87.5)
    expect(result.total).toBe(437.5)
  })

  it('returns zeros for an empty item list', () => {
    const result = calcularOrcamento([], 25)
    expect(result).toEqual({ subtotalMaterial: 0, subtotalMaoObra: 0, subtotal: 0, valorBdi: 0, total: 0 })
  })

  it('treats missing/NaN quantidade or valor_unit as zero', () => {
    const itens = [item('material', NaN, 100)]
    const result = calcularOrcamento(itens, 10)
    expect(result.subtotalMaterial).toBe(0)
  })
})

describe('formatarMoeda', () => {
  it('formats as BRL currency', () => {
    expect(formatarMoeda(1234.5)).toBe('R$ 1.234,50')
  })
})
