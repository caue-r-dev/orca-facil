'use client'

import { formatarMoeda } from '@/lib/calc'
import { NumeroInput } from '@/components/NumeroInput'
import { useState } from 'react'

export function CadastroServicoForm({ adicionarServico }: { adicionarServico: (formData: FormData) => Promise<void> }) {
  const [unidade, setUnidade] = useState('un')
  const [valorUnitPadrao, setValorUnitPadrao] = useState(0)

  return (
    <details className="rounded-sm border border-brass bg-brass-soft/30">
      <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-bold text-blueprint-deep">
        + Cadastrar serviço
      </summary>
      <form action={adicionarServico} className="flex flex-col gap-3 border-t border-brass px-4 py-4 text-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Descrição</span>
            <input name="descricao" required className="w-full border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Unidade</span>
            <select name="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} className="w-full border-b border-line bg-white py-1 outline-none focus:border-brass">
              <option value="m²">m² (metro quadrado)</option>
              <option value="m">m (metro linear)</option>
              <option value="un">un (unidade)</option>
              <option value="h">h (hora)</option>
              <option value="m³">m³ (metro cúbico)</option>
              <option value="vb">vb (verba/fixo)</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Valor (R$)</span>
            <NumeroInput
              step="0.01"
              min="0"
              name="valorUnitPadrao"
              value={valorUnitPadrao}
              onChange={setValorUnitPadrao}
              className="font-mono-num w-full border-b border-line bg-transparent py-1 outline-none focus:border-brass"
            />
          </label>
          <button type="submit" className="btn-primary w-full px-4 py-2 text-sm sm:w-auto">Salvar serviço</button>
        </div>
        <div className="font-mono-num text-xs text-ink-soft">
          {formatarMoeda(valorUnitPadrao)}/{unidade}
        </div>
      </form>
    </details>
  )
}
