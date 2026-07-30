import { describe, it, expect } from 'vitest'
import { calcularOrcamento, formatarMoeda, valorFinalItem } from './calc'
import type { ItemOrcamento } from './types'

const item = (
  categoria: 'material' | 'mao_obra',
  quantidade: number,
  valor_unit: number,
  valor_material = 0,
  valor_customizado: number | null = null
): Pick<ItemOrcamento, 'categoria' | 'quantidade' | 'valor_unit' | 'valor_material' | 'valor_customizado'> => ({
  categoria, quantidade, valor_unit, valor_material, valor_customizado,
})

describe('valorFinalItem', () => {
  it('uses the calculated formula when valor_customizado is null', () => {
    expect(valorFinalItem({ quantidade: 3, valor_unit: 50, valor_material: 10, valor_customizado: null })).toBe(160)
  })

  it('uses valor_customizado directly when set, ignoring quantidade/valor_unit/valor_material', () => {
    expect(valorFinalItem({ quantidade: 3, valor_unit: 50, valor_material: 10, valor_customizado: 999 })).toBe(999)
  })

  it('treats valor_customizado of 0 as an active override, not "unset"', () => {
    expect(valorFinalItem({ quantidade: 3, valor_unit: 50, valor_material: 10, valor_customizado: 0 })).toBe(0)
  })
})

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

  it('adds valor_material (soma dos materiais por conta do prestador) flat, sem multiplicar por quantidade', () => {
    const itens = [item('mao_obra', 1, 80, 55)]
    const result = calcularOrcamento(itens)
    expect(result.subtotalMaoObra).toBe(135)
    expect(result.total).toBe(135)
  })

  it('does not multiply valor_material by quantidade', () => {
    const itens = [item('mao_obra', 10, 8, 55)]
    const result = calcularOrcamento(itens)
    expect(result.total).toBe(135)
  })

  it('uses valor_customizado as the line total when set, instead of quantidade*valor_unit+valor_material', () => {
    const itens = [item('mao_obra', 10, 8, 55, 300)]
    const result = calcularOrcamento(itens)
    expect(result.subtotalMaoObra).toBe(300)
    expect(result.total).toBe(300)
  })
})

describe('formatarMoeda', () => {
  it('formats as BRL currency', () => {
    expect(formatarMoeda(1234.5)).toBe('R$ 1.234,50')
  })
})
