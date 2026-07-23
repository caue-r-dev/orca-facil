import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adicionarItemBiblioteca, removerItemBiblioteca } from '../configuracoes/actions'
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
      valorUnitPadrao: Number(formData.get('valorUnitPadrao') ?? 0),
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-blueprint-deep">Materiais</h1>
      <p className="mt-2 text-sm text-ink-soft">Materiais cadastrados aqui ficam disponíveis para escolher no card Composição de Custo de qualquer Ambiente.</p>

      <div className="mt-8 border border-line bg-white p-4 sm:p-5">
        <details className="rounded-sm border border-brass bg-brass-soft/30">
          <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-bold text-blueprint-deep">
            + Cadastrar material
          </summary>
          <form action={adicionarMaterial} className="grid grid-cols-1 gap-3 border-t border-brass px-4 py-4 text-sm sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Descrição</span>
              <input name="descricao" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Unidade</span>
              <input name="unidade" defaultValue="m²" className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Valor (R$)</span>
              <input type="number" name="valorUnitPadrao" placeholder="0" className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            </label>
            <button type="submit" className="rounded-sm bg-blueprint-deep px-4 py-2 text-sm font-bold text-paper">Salvar material</button>
          </form>
        </details>

        <ul className="mt-4 flex flex-col gap-2">
          {(materiais ?? []).length === 0 && (
            <li className="text-sm italic text-ink-soft">Nenhum material cadastrado ainda.</li>
          )}
          {(materiais ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-sm bg-paper px-3 py-2.5 text-sm">
              <span>{item.descricao} <span className="text-ink-soft">· R$ {item.valor_unit_padrao}/{item.unidade}</span></span>
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
