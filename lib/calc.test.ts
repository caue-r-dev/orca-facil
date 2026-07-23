import { describe, it, expect } from 'vitest'
import { calcularOrcamento, formatarMoeda } from './calc'
import type { ItemOrcamento } from './types'

const item = (
  categoria: 'material' | 'mao_obra',
  quantidade: number,
  valor_unit: number
): Pick<ItemOrcamento, 'categoria' | 'quantidade' | 'valor_unit'> => ({ categoria, quantidade, valor_unit })

describe('calcularOrcamento', () => {
  it('splits material and mao_obra subtotals and totals as their direct sum', () => {
    const itens = [item('material', 2, 100), item('mao_obra', 3, 50)]
    const result = calcularOrcamento(itens)
    expect(result.subtotalMaterial).toBe(200)
    expect(result.subtotalMaoObra).toBe(150)
    expect(result.subtotal).toBe(350)
    expect(result.total).toBe(350)
  })

  it('returns zeros for an empty item list', () => {
    const result = calcularOrcamento([])
    expect(result).toEqual({ subtotalMaterial: 0, subtotalMaoObra: 0, subtotal: 0, total: 0 })
  })

  it('treats missing/NaN quantidade or valor_unit as zero', () => {
    const itens = [item('material', NaN, 100)]
    const result = calcularOrcamento(itens)
    expect(result.subtotalMaterial).toBe(0)
  })
})

describe('formatarMoeda', () => {
  it('formats as BRL currency', () => {
    expect(formatarMoeda(1234.5)).toBe('R$ 1.234,50')
  })
})
