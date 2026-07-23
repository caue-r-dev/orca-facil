import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SEGMENTOS } from '@/lib/segmentos-seed'
import { formatarMoeda } from '@/lib/calc'
import type { Empresa, ItemBiblioteca } from '@/lib/types'

export default async function AdminEmpresaPage({ params }: { params: Promise<{ empresaId: string }> }) {
  const { empresaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioAtual } = await supabase.from('usuarios').select('role').eq('id', user.id).single<{ role: string }>()
  if (!usuarioAtual || usuarioAtual.role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()
  const { data: empresa } = await admin.from('empresas').select('*').eq('id', empresaId).single<Empresa>()
  if (!empresa) notFound()

  const { data: servicos } = await admin
    .from('itens_biblioteca_empresa')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('descricao')
    .returns<ItemBiblioteca[]>()

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/admin" className="text-xs font-bold text-brass underline">← Voltar</Link>
      <h1 className="mt-2 text-2xl font-bold text-blueprint-deep">{empresa.nome}</h1>
      <p className="text-sm text-ink-soft">{SEGMENTOS[empresa.segmento_padrao as keyof typeof SEGMENTOS]?.label ?? empresa.segmento_padrao}</p>

      <div className="mt-8 border border-line bg-white p-4 sm:p-5">
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">Serviços cadastrados</div>
        <ul className="flex flex-col gap-2">
          {(servicos ?? []).length === 0 && (
            <li className="text-sm italic text-ink-soft">Nenhum serviço cadastrado ainda.</li>
          )}
          {(servicos ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-sm bg-paper px-3 py-2.5 text-sm">
              <span>
                {item.descricao}{' '}
                <span className="text-ink-soft">
                  · {item.categoria === 'material' ? 'Material' : 'Mão de obra'} · {formatarMoeda(item.valor_unit_padrao)}/{item.unidade}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
