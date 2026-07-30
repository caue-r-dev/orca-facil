import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adicionarItemBiblioteca, removerItemBiblioteca } from '../configuracoes/actions'
import { CadastroServicoForm } from './CadastroServicoForm'
import { formatarMoeda } from '@/lib/calc'
import type { ItemBiblioteca } from '@/lib/types'

export default async function ServicosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
  if (!usuario) redirect('/login')

  const { data: servicos } = await supabase
    .from('itens_biblioteca_empresa')
    .select('*')
    .eq('empresa_id', usuario.empresa_id)
    .eq('categoria', 'mao_obra')
    .order('descricao')
    .returns<ItemBiblioteca[]>()

  async function adicionarServico(formData: FormData) {
    'use server'
    await adicionarItemBiblioteca(usuario!.empresa_id, {
      descricao: String(formData.get('descricao') ?? ''),
      categoria: 'mao_obra',
      unidade: String(formData.get('unidade') ?? 'un'),
      valorUnitPadrao: Number(formData.get('valorUnitPadrao') ?? 0),
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-blueprint-deep">Serviços</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Serviços cadastrados aqui ficam disponíveis pra adicionar a qualquer ambiente de um orçamento. Editar o valor
        aqui muda o preço-base pra orçamentos futuros — não altera valores já sobrescritos manualmente em orçamentos existentes.
      </p>

      <div className="mt-8 border border-line bg-white p-4 sm:p-5">
        <CadastroServicoForm adicionarServico={adicionarServico} />

        <ul className="mt-4 flex flex-col gap-2">
          {(servicos ?? []).length === 0 && (
            <li className="text-sm italic text-ink-soft">Nenhum serviço cadastrado ainda.</li>
          )}
          {(servicos ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-sm bg-paper px-3 py-2.5 text-sm">
              <span>
                {item.descricao}{' '}
                <span className="font-mono-num text-ink-soft">· {formatarMoeda(item.valor_unit_padrao)}/{item.unidade}</span>
              </span>
              <form action={async () => { 'use server'; await removerItemBiblioteca(item.id) }}>
                <button type="submit" className="text-danger">×</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
