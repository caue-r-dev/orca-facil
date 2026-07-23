import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adicionarItemBiblioteca, removerItemBiblioteca } from '../configuracoes/actions'
import { CadastroMaterialForm } from './CadastroMaterialForm'
import { formatarMoeda } from '@/lib/calc'
import type { ItemBiblioteca } from '@/lib/types'

export default async function MateriaisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
  if (!usuario) redirect('/login')

  const { data: materiais } = await supabase
    .from('itens_biblioteca_empresa')
    .select('*')
    .eq('empresa_id', usuario.empresa_id)
    .eq('categoria', 'material')
    .order('descricao')
    .returns<ItemBiblioteca[]>()

  async function adicionarMaterial(formData: FormData) {
    'use server'
    await adicionarItemBiblioteca(usuario!.empresa_id, {
      descricao: String(formData.get('descricao') ?? ''),
      categoria: 'material',
      unidade: String(formData.get('unidade') ?? 'm²'),
      custoAquisicao: Number(formData.get('custoAquisicao') ?? 0),
      margemPercentual: Number(formData.get('margemPercentual') ?? 0),
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-blueprint-deep">Materiais</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Materiais cadastrados aqui ficam disponíveis para escolher no card Composição de Custo de qualquer Ambiente,
        e como item comum em orçamentos de qualquer segmento. O valor de venda é sempre custo de aquisição + sua margem.
      </p>

      <div className="mt-8 border border-line bg-white p-4 sm:p-5">
        <CadastroMaterialForm adicionarMaterial={adicionarMaterial} />

        <ul className="mt-4 flex flex-col gap-2">
          {(materiais ?? []).length === 0 && (
            <li className="text-sm italic text-ink-soft">Nenhum material cadastrado ainda.</li>
          )}
          {(materiais ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-sm bg-paper px-3 py-2.5 text-sm">
              <span>
                {item.descricao}{' '}
                <span className="font-mono-num text-ink-soft">
                  {item.custo_aquisicao !== null
                    ? `· ${formatarMoeda(item.custo_aquisicao)} + ${item.margem_percentual}% = ${formatarMoeda(item.valor_unit_padrao)}/${item.unidade}`
                    : `· ${formatarMoeda(item.valor_unit_padrao)}/${item.unidade}`}
                </span>
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
