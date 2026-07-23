import type { SegmentoKey } from './types'

export interface SegmentoSeed {
  label: string
  bdiPadrao: number
}

export const SEGMENTOS: Record<SegmentoKey, SegmentoSeed> = {
  eletrica: { label: 'Elétrica', bdiPadrao: 25 },
  hidraulica: { label: 'Hidráulica', bdiPadrao: 25 },
  construcao: { label: 'Pedreiro / Construção', bdiPadrao: 22 },
  drywall: { label: 'Drywall', bdiPadrao: 24 },
  geral: { label: 'Outro serviço', bdiPadrao: 25 },
}
