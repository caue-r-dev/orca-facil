'use client'

import { useState } from 'react'
import { calcularValorVendaMaterial, formatarMoeda } from '@/lib/calc'

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Descrição</span>
            <input name="descricao" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Unidade</span>
            <input name="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Custo de aquisição (R$)</span>
            <input
              type="number"
              name="custoAquisicao"
              value={custoAquisicao}
              onChange={(e) => setCustoAquisicao(Number(e.target.value))}
              className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Margem (%)</span>
            <input
              type="number"
              name="margemPercentual"
              value={margemPercentual}
              onChange={(e) => setMargemPercentual(Number(e.target.value))}
              className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass"
            />
          </label>
          <button type="submit" className="rounded-sm bg-blueprint-deep px-4 py-2 text-sm font-bold text-paper">Salvar material</button>
        </div>
        <div className="font-mono-num text-xs text-ink-soft">
          {formatarMoeda(custoAquisicao)} + {margemPercentual}% = {formatarMoeda(valorVenda)}/{unidade}
        </div>
      </form>
    </details>
  )
}
