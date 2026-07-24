import { describe, it, expect } from 'vitest'
import { calcularOrcamento, formatarMoeda } from './calc'
import type { ItemOrcamento } from './types'

const item = (
  categoria: 'material' | 'mao_obra',
  quantidade: number,
  valor_unit: number,
  valor_material = 0
): Pick<ItemOrcamento, 'categoria' | 'quantidade' | 'valor_unit' | 'valor_material'> => ({ categoria, quantidade, valor_unit, valor_material })

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
    // mão de obra R$ 80 (quantidade 1) + Guia R$ 22 + Montante R$ 33 = R$ 135
    const itens = [item('mao_obra', 1, 80, 55)]
    const result = calcularOrcamento(itens)
    expect(result.subtotalMaoObra).toBe(135)
    expect(result.total).toBe(135)
  })

  it('does not multiply valor_material by quantidade', () => {
    const itens = [item('mao_obra', 10, 8, 55)]
    const result = calcularOrcamento(itens)
    // 10 * 8 + 55 = 135, nunca (8 + 55) * 10
    expect(result.total).toBe(135)
  })
})

describe('formatarMoeda', () => {
  it('formats as BRL currency', () => {
    expect(formatarMoeda(1234.5)).toBe('R$ 1.234,50')
  })
})
