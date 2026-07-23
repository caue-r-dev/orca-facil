import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { atualizarEmpresa, atualizarLogo, adicionarItemBiblioteca, removerItemBiblioteca } from './actions'
import type { Empresa, ItemBiblioteca } from '@/lib/types'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
  if (!usuario) redirect('/login')

  const { data: empresa } = await supabase.from('empresas').select('*').eq('id', usuario.empresa_id).single<Empresa>()
  const { data: biblioteca } = await supabase
    .from('itens_biblioteca_empresa')
    .select('*')
    .eq('empresa_id', usuario.empresa_id)
    .order('descricao')
    .returns<ItemBiblioteca[]>()

  async function salvarEmpresa(formData: FormData) {
    'use server'
    await atualizarEmpresa(usuario!.empresa_id, {
      nome: String(formData.get('nome') ?? ''),
      cnpj: String(formData.get('cnpj') ?? ''),
      telefone: String(formData.get('telefone') ?? ''),
      bdiPadrao: Number(formData.get('bdiPadrao') ?? 0),
    })
  }

  async function salvarLogo(formData: FormData) {
    'use server'
    await atualizarLogo(usuario!.empresa_id, formData)
  }

  async function adicionarItem(formData: FormData) {
    'use server'
    await adicionarItemBiblioteca(usuario!.empresa_id, {
      descricao: String(formData.get('descricao') ?? ''),
      categoria: String(formData.get('categoria') ?? 'mao_obra') as 'material' | 'mao_obra',
      unidade: String(formData.get('unidade') ?? 'un'),
      valorUnitPadrao: Number(formData.get('valorUnitPadrao') ?? 0),
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-blueprint-deep">Configurações</h1>

      <form action={salvarEmpresa} className="mt-8 flex flex-col gap-4 border-b border-line pb-8">
        <h2 className="text-xs font-bold uppercase tracking-wide text-brass">Dados da empresa</h2>
        <label className="flex flex-col gap-1 text-sm">Nome
          <input name="nome" defaultValue={empresa?.nome} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <label className="flex flex-col gap-1 text-sm">CNPJ
          <input name="cnpj" defaultValue={empresa?.cnpj ?? ''} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <label className="flex flex-col gap-1 text-sm">Telefone
          <input name="telefone" defaultValue={empresa?.telefone ?? ''} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <label className="flex flex-col gap-1 text-sm">BDI padrão (%)
          <input type="number" name="bdiPadrao" defaultValue={empresa?.bdi_padrao} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <button type="submit" className="mt-2 self-start rounded-sm bg-blueprint-deep px-4 py-2 text-sm font-bold text-paper">Salvar</button>
      </form>

      <div className="mt-8 flex flex-col gap-3 border-b border-line pb-8">
        <h2 className="text-xs font-bold uppercase tracking-wide text-brass">Logo da empresa</h2>
        {empresa?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={empresa.logo_url} alt="Logo atual" className="h-16 w-auto self-start object-contain" />
        )}
        <form action={salvarLogo} className="flex flex-wrap items-center gap-3 text-sm">
          <input type="file" name="logo" accept="image/png,image/jpeg,image/svg+xml,image/webp" required />
          <button type="submit" className="rounded-sm bg-blueprint-deep px-4 py-2 text-sm font-bold text-paper">Enviar logo</button>
        </form>
        <p className="text-xs text-ink-soft">PNG, JPG, SVG ou WebP. Aparece só na proposta pública ({'/o/[id]'}), não no sistema.</p>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wide text-brass">Biblioteca de itens</h2>
        </div>

        <details className="mt-3 rounded-sm border border-brass bg-brass-soft/30">
          <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-bold text-blueprint-deep">
            + Cadastrar serviço
          </summary>
          <form action={adicionarItem} className="grid grid-cols-1 gap-2 border-t border-brass px-4 py-4 text-sm sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <input name="descricao" placeholder="Descrição" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            <select name="categoria" className="border-b border-line bg-transparent py-1 outline-none focus:border-brass">
              <option value="material">Material</option>
              <option value="mao_obra">Mão de obra</option>
            </select>
            <input name="unidade" placeholder="un" defaultValue="un" className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            <input type="number" name="valorUnitPadrao" placeholder="0" className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            <button type="submit" className="rounded-sm bg-blueprint-deep px-4 py-2 text-sm font-bold text-paper">Salvar serviço</button>
          </form>
        </details>

        <ul className="mt-4 flex flex-col gap-2">
          {(biblioteca ?? []).length === 0 && (
            <li className="text-sm italic text-ink-soft">Nenhum serviço cadastrado ainda.</li>
          )}
          {(biblioteca ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between border border-line bg-white px-3 py-2 text-sm">
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
