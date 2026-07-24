import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { OrcamentosList } from './OrcamentosList'
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
        <Link href="/orcamentos/novo" className="btn-primary px-4 py-2 text-sm">
          + Novo orçamento
        </Link>
      </div>

      <OrcamentosList orcamentosIniciais={orcamentos ?? []} />
    </main>
  )
}
