import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
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
        <p className="mt-8 text-ink-soft italic">Nenhum orçamento ainda. Crie o primeiro.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {orcamentos.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orcamentos/${o.id}`}
                className="flex items-center justify-between rounded-sm border border-line bg-white px-4 py-3"
              >
                <span>{o.cliente_nome}</span>
                <span className="font-mono-num text-sm text-ink-soft">{o.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
