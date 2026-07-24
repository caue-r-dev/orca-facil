'use client'

import { useState } from 'react'
import { calcularValorVendaMaterial, formatarMoeda } from '@/lib/calc'
import { NumeroInput } from '@/components/NumeroInput'

export function CadastroMaterialForm({ adicionarMaterial }: { adicionarMaterial: (formData: FormData) => Promise<void> }) {
  const [custoAquisicao, setCustoAquisicao] = useState(0)
  const [margemPercentual, setMargemPercentual] = useState(0)
  const [unidade, setUnidade] = useState('m²')
  const valorVenda = calcularValorVendaMaterial(custoAquisicao, margemPercentual)

  return (
    <details className="rounded-sm border border-brass bg-brass-soft/30">
      <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-bold text-blueprint-deep">
        + Cadastrar material
      </summary>
      <form action={adicionarMaterial} className="flex flex-col gap-3 border-t border-brass px-4 py-4 text-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Descrição</span>
            <input name="descricao" required className="w-full border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Unidade</span>
            <input name="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} className="w-full border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Custo de aquisição (R$)</span>
            <NumeroInput
              step="0.01"
              min="0"
              name="custoAquisicao"
              value={custoAquisicao}
              onChange={setCustoAquisicao}
              className="font-mono-num w-full border-b border-line bg-transparent py-1 outline-none focus:border-brass"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Margem (%)</span>
            <NumeroInput
              step="0.01"
              min="0"
              name="margemPercentual"
              value={margemPercentual}
              onChange={setMargemPercentual}
              className="font-mono-num w-full border-b border-line bg-transparent py-1 outline-none focus:border-brass"
            />
          </label>
          <button type="submit" className="btn-primary w-full px-4 py-2 text-sm sm:w-auto">Salvar material</button>
        </div>
        <div className="font-mono-num text-xs text-ink-soft">
          {formatarMoeda(custoAquisicao)} + {margemPercentual}% = {formatarMoeda(valorVenda)}/{unidade}
        </div>
      </form>
    </details>
  )
}
