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

      <div className="mb-8 mt-8">
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">Dados da empresa</div>
        <form action={salvarEmpresa} className="flex flex-col gap-4 border border-line bg-white p-4 sm:p-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Nome</span>
            <input name="nome" defaultValue={empresa?.nome} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">CNPJ</span>
            <input name="cnpj" defaultValue={empresa?.cnpj ?? ''} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Telefone</span>
            <input name="telefone" defaultValue={empresa?.telefone ?? ''} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
          <button type="submit" className="mt-1 self-start rounded-sm bg-blueprint-deep px-4 py-2 text-sm font-bold text-paper">Salvar</button>
        </form>
      </div>

      <div className="mb-8">
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">Logo da empresa</div>
        <div className="flex flex-col gap-3 border border-line bg-white p-4 sm:p-5">
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
      </div>

      <div>
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">Biblioteca de itens</div>
        <div className="border border-line bg-white p-4 sm:p-5">
          <details className="rounded-sm border border-brass bg-brass-soft/30">
            <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-bold text-blueprint-deep">
              + Cadastrar serviço
            </summary>
            <form action={adicionarItem} className="grid grid-cols-1 gap-3 border-t border-brass px-4 py-4 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
              <input type="hidden" name="categoria" value="mao_obra" />
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Descrição</span>
                <input name="descricao" required className="w-full border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Unidade</span>
                <select name="unidade" defaultValue="un" className="w-full border-b border-line bg-transparent py-1 outline-none focus:border-brass">
                  <option value="m²">m² (metro quadrado)</option>
                  <option value="m">m (metro linear)</option>
                  <option value="un">un (unidade)</option>
                  <option value="h">h (hora)</option>
                  <option value="m³">m³ (metro cúbico)</option>
                  <option value="vb">vb (verba/fixo)</option>
                </select>
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Valor (R$)</span>
                <input type="number" step="0.01" min="0" name="valorUnitPadrao" placeholder="0,00" className="font-mono-num w-full border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
              </label>
              <button type="submit" className="w-full rounded-sm bg-blueprint-deep px-4 py-2 text-sm font-bold text-paper sm:w-auto">Salvar serviço</button>
            </form>
          </details>

          <ul className="mt-4 flex flex-col gap-2">
            {(biblioteca ?? []).length === 0 && (
              <li className="text-sm italic text-ink-soft">Nenhum serviço cadastrado ainda.</li>
            )}
            {(biblioteca ?? []).map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-sm bg-paper px-3 py-2.5 text-sm">
                <span>{item.descricao} <span className="text-ink-soft">· R$ {item.valor_unit_padrao}/{item.unidade}</span></span>
                <form action={async () => { 'use server'; await removerItemBiblioteca(item.id) }}>
                  <button type="submit" className="text-danger">×</button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}
