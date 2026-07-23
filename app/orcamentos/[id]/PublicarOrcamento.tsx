'use client'

import { useState } from 'react'
import Link from 'next/link'
import { publicarOrcamento } from './actions'
import { CopiarLinkButton } from '@/components/CopiarLinkButton'
import type { OrcamentoStatus } from '@/lib/types'

export function PublicarOrcamento({ orcamentoId, statusInicial }: { orcamentoId: string; statusInicial: OrcamentoStatus }) {
  const [status, setStatus] = useState(statusInicial)
  const [publicando, setPublicando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function publicar() {
    setErro(null)
    setPublicando(true)
    const resultado = await publicarOrcamento(orcamentoId)
    setPublicando(false)
    if (resultado?.error) {
      setErro(resultado.error)
      return
    }
    setStatus('enviado')
  }

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-line bg-white px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-ink-soft">Status:</span>
        <span className={`rounded-sm px-2 py-1 text-xs font-bold uppercase ${status === 'enviado' ? 'bg-brass-soft text-blueprint-deep' : 'bg-paper text-ink-soft'}`}>
          {status === 'enviado' ? 'Publicado' : 'Rascunho'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {status !== 'enviado' ? (
          <button onClick={publicar} disabled={publicando} className="rounded-sm bg-blueprint-deep px-4 py-2 text-sm font-bold text-paper disabled:opacity-50">
            {publicando ? 'Publicando…' : 'Publicar orçamento'}
          </button>
        ) : (
          <>
            <CopiarLinkButton caminho={`/o/${orcamentoId}`} />
            <Link href={`/o/${orcamentoId}`} target="_blank" className="text-sm font-bold text-brass underline">Ver proposta pública</Link>
            <Link href={`/o/${orcamentoId}`} target="_blank" className="rounded-sm bg-blueprint-deep px-4 py-2 text-sm font-bold text-paper">Exportar PDF</Link>
          </>
        )}
      </div>
      {erro && <p className="w-full text-sm text-danger">{erro}</p>}
    </div>
  )
}
