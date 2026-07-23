import { describe, it, expect } from 'vitest'
import { SEGMENTOS } from './segmentos-seed'

describe('SEGMENTOS', () => {
  it('has an entry for every SegmentoKey used by the app', () => {
    expect(Object.keys(SEGMENTOS).sort()).toEqual(
      ['construcao', 'drywall', 'eletrica', 'geral', 'hidraulica'].sort()
    )
  })

  it('every segment has a label', () => {
    for (const seg of Object.values(SEGMENTOS)) {
      expect(seg.label.length).toBeGreaterThan(0)
    }
  })
})
