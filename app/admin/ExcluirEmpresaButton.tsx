'use client'

import { useState } from 'react'
import { excluirEmpresa } from './actions'

export function ExcluirEmpresaButton({ empresaId, empresaNome }: { empresaId: string; empresaNome: string }) {
  const [aberto, setAberto] = useState(false)
  const [digitado, setDigitado] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="text-xs font-bold text-danger underline">
        Excluir
      </button>
    )
  }

  async function confirmar() {
    setErro(null)
    setExcluindo(true)
    const resultado = await excluirEmpresa(empresaId, digitado)
    setExcluindo(false)
    if (resultado?.error) setErro(resultado.error)
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-sm border border-danger bg-danger/5 p-2.5 text-xs" style={{ minWidth: '220px' }}>
      <p className="font-bold text-danger">Excluir &ldquo;{empresaNome}&rdquo;?</p>
      <p className="text-ink-soft">Ação permanente. Remove empresa, orçamentos, itens, biblioteca e histórico de uso — sem volta.</p>
      <label className="flex flex-col gap-1">
        Digite <strong>{empresaNome}</strong> pra confirmar
        <input
          value={digitado}
          onChange={(e) => setDigitado(e.target.value)}
          className="border-b border-line bg-white px-1 py-1 outline-none focus:border-danger"
        />
      </label>
      {erro && <p className="text-danger">{erro}</p>}
      <div className="flex gap-2">
        <button
          onClick={confirmar}
          disabled={digitado !== empresaNome || excluindo}
          className="rounded-sm bg-danger px-3 py-1.5 font-bold text-paper disabled:opacity-40"
        >
          {excluindo ? 'Excluindo…' : 'Excluir definitivamente'}
        </button>
        <button onClick={() => { setAberto(false); setDigitado(''); setErro(null) }} className="rounded-sm border border-line px-3 py-1.5 text-ink-soft">
          Cancelar
        </button>
      </div>
    </div>
  )
}
