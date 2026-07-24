'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CopiarLinkButton } from '@/components/CopiarLinkButton'
import type { Orcamento } from '@/lib/types'
import { apagarOrcamento } from './actions'

export function OrcamentosList({ orcamentosIniciais }: { orcamentosIniciais: Orcamento[] }) {
  const [orcamentos, setOrcamentos] = useState(orcamentosIniciais)
  const [paraApagar, setParaApagar] = useState<Orcamento | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function confirmarExclusao() {
    if (!paraApagar) return
    const alvo = paraApagar
    setErro(null)
    // Atualização otimista: fecha o modal e some da lista antes da
    // resposta do servidor; se der erro, o card volta pro lugar
    // (rollback) e mostra a mensagem de erro.
    setOrcamentos((prev) => prev.filter((o) => o.id !== alvo.id))
    setParaApagar(null)
    const resultado = await apagarOrcamento(alvo.id)
    if (resultado?.error) {
      setOrcamentos((prev) => [...prev, alvo].sort((a, b) => b.created_at.localeCompare(a.created_at)))
      setErro(`Não foi possível apagar "${alvo.cliente_nome}". Tente novamente.`)
    }
  }

  if (orcamentos.length === 0) {
    return (
      <div className="mt-8 border border-line bg-white p-8 text-center">
        <p className="italic text-ink-soft">Nenhum orçamento ainda. Crie o primeiro.</p>
      </div>
    )
  }

  return (
    <>
      {erro && (
        <p className="mt-4 border border-danger bg-white px-4 py-2.5 text-sm text-danger">
          {erro}
        </p>
      )}

      <ul className="mt-8 flex flex-col gap-3">
        {orcamentos.map((o) => (
          <li key={o.id} className="flex flex-col gap-2 border border-line bg-white px-4 py-4 transition-colors hover:border-brass sm:px-5">
            <Link href={`/orcamentos/${o.id}`} className="flex items-center justify-between">
              <span className="font-bold text-blueprint-deep">{o.cliente_nome}</span>
              <span className={o.status === 'enviado' ? 'badge-status' : 'font-mono-num px-2.5 py-1 text-[10px] uppercase tracking-wide bg-paper text-ink-soft'}>
                {o.status === 'enviado' ? 'publicado' : o.status}
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-3 border-t border-dotted border-line pt-2">
              {o.status === 'enviado' && (
                <>
                  <CopiarLinkButton caminho={`/o/${o.id}`} className="text-xs font-bold text-brass underline" />
                  <Link href={`/o/${o.id}`} target="_blank" className="text-xs font-bold text-brass underline">Ver proposta</Link>
                  <Link href={`/o/${o.id}`} target="_blank" className="text-xs font-bold text-blueprint-deep underline">Exportar PDF</Link>
                </>
              )}
              <button
                type="button"
                onClick={() => setParaApagar(o)}
                className="text-xs font-bold text-danger underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
              >
                Apagar
              </button>
            </div>
          </li>
        ))}
      </ul>

      {paraApagar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm border border-brand-border bg-white p-6">
            <h2 className="font-serif-body text-lg font-medium text-brand-text">Apagar orçamento?</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Apagar o orçamento &ldquo;{paraApagar.cliente_nome}&rdquo;? Essa ação não pode ser desfeita.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setParaApagar(null)}
                className="border border-brand-border bg-white px-4 py-2 text-sm text-brand-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusao}
                className="bg-danger px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
