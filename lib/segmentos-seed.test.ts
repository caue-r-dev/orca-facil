import { describe, it, expect } from 'vitest'
import { SEGMENTOS } from './segmentos-seed'

describe('SEGMENTOS', () => {
  it('has an entry for every SegmentoKey used by the app', () => {
    expect(Object.keys(SEGMENTOS).sort()).toEqual(
      ['construcao', 'drywall', 'eletrica', 'geral', 'hidraulica'].sort()
    )
  })

  it('geral has no default items (custom/other segment)', () => {
    expect(SEGMENTOS.geral.itens).toEqual([])
  })

  it('every non-geral segment has at least one item with a positive valorUnitPadrao', () => {
    for (const key of ['eletrica', 'hidraulica', 'construcao', 'drywall'] as const) {
      expect(SEGMENTOS[key].itens.length).toBeGreaterThan(0)
      for (const item of SEGMENTOS[key].itens) {
        expect(item.valorUnitPadrao).toBeGreaterThan(0)
        expect(['material', 'mao_obra']).toContain(item.categoria)
      }
    }
  })
})
