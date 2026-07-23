import type { SegmentoKey } from './types'

export interface SegmentoSeed {
  label: string
}

export const SEGMENTOS: Record<SegmentoKey, SegmentoSeed> = {
  eletrica: { label: 'Elétrica' },
  hidraulica: { label: 'Hidráulica' },
  construcao: { label: 'Pedreiro / Construção' },
  drywall: { label: 'Drywall' },
  geral: { label: 'Outro serviço' },
}
