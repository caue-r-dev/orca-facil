import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CopiarLinkButton } from '@/components/CopiarLinkButton'
import type { Orcamento } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: orcamentos } = await supabase
    .from('orcamentos')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Orcamento[]>()

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blueprint-deep">Meus orçamentos</h1>
        <Link href="/orcamentos/novo" className="rounded-sm bg-blueprint-deep px-4 py-2 font-sans text-sm font-bold text-paper">
          + Novo orçamento
        </Link>
      </div>

      {(!orcamentos || orcamentos.length === 0) ? (
        <div className="mt-8 border border-line bg-white p-8 text-center">
          <p className="italic text-ink-soft">Nenhum orçamento ainda. Crie o primeiro.</p>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {orcamentos.map((o) => (
            <li key={o.id} className="flex flex-col gap-2 border border-line bg-white px-4 py-4 transition-colors hover:border-brass sm:px-5">
              <Link href={`/orcamentos/${o.id}`} className="flex items-center justify-between">
                <span className="font-bold text-blueprint-deep">{o.cliente_nome}</span>
                <span className={`font-mono-num rounded-sm px-2.5 py-1 text-[10px] uppercase tracking-wide ${o.status === 'enviado' ? 'bg-brass-soft text-blueprint-deep' : 'bg-paper text-ink-soft'}`}>
                  {o.status === 'enviado' ? 'publicado' : o.status}
                </span>
              </Link>
              {o.status === 'enviado' && (
                <div className="flex flex-wrap items-center gap-3 border-t border-dotted border-line pt-2">
                  <CopiarLinkButton caminho={`/o/${o.id}`} className="text-xs font-bold text-brass underline" />
                  <Link href={`/o/${o.id}`} target="_blank" className="text-xs font-bold text-brass underline">Ver proposta</Link>
                  <Link href={`/o/${o.id}`} target="_blank" className="text-xs font-bold text-blueprint-deep underline">Exportar PDF</Link>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
