import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { bloquearEmpresa, desbloquearEmpresa, renovarAcesso } from './actions'
import { ExcluirEmpresaButton } from './ExcluirEmpresaButton'
import { SEGMENTOS } from '@/lib/segmentos-seed'
import type { Empresa, EventoUso, Usuario } from '@/lib/types'

function diasAteVencimento(dataVencimento: string): number {
  const hoje = new Date(new Date().toISOString().slice(0, 10))
  const venc = new Date(dataVencimento)
  return Math.round((venc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioAtual } = await supabase.from('usuarios').select('role').eq('id', user.id).single<{ role: string }>()
  if (!usuarioAtual || usuarioAtual.role !== 'admin') redirect('/dashboard')

  const admin = createAdminClient()

  const { data: empresas } = await admin.from('empresas').select('*').order('created_at', { ascending: false }).returns<Empresa[]>()
  const { data: usuarios } = await admin.from('usuarios').select('*').eq('role', 'prestador').returns<Usuario[]>()
  const { data: eventos } = await admin.from('eventos_uso').select('*').returns<EventoUso[]>()
  const { data: orcamentos } = await admin.from('orcamentos').select('empresa_id')
  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 })

  const usuarioPorEmpresa = new Map((usuarios ?? []).map((u) => [u.empresa_id, u]))
  const emailPorUsuarioId = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email]))
  const orcamentosPorEmpresa = new Map<string, number>()
  for (const o of orcamentos ?? []) {
    orcamentosPorEmpresa.set(o.empresa_id, (orcamentosPorEmpresa.get(o.empresa_id) ?? 0) + 1)
  }
  const ultimoLoginPorEmpresa = new Map<string, string>()
  for (const e of eventos ?? []) {
    if (e.tipo_evento !== 'login') continue
    const atual = ultimoLoginPorEmpresa.get(e.empresa_id)
    if (!atual || e.created_at > atual) ultimoLoginPorEmpresa.set(e.empresa_id, e.created_at)
  }

  async function alternarStatus(formData: FormData) {
    'use server'
    const empresaId = String(formData.get('empresaId'))
    const ativo = formData.get('ativo') === 'true'
    if (ativo) await bloquearEmpresa(empresaId)
    else await desbloquearEmpresa(empresaId)
  }

  async function renovar(formData: FormData) {
    'use server'
    const empresaId = String(formData.get('empresaId'))
    const novaData = String(formData.get('novaData') ?? '')
    await renovarAcesso(empresaId, novaData || undefined)
  }

  const vencimentoPadrao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blueprint-deep">Admin — Prestadores</h1>
        <Link href="/admin/nova-conta" className="rounded-sm bg-blueprint-deep px-4 py-2 font-sans text-sm font-bold text-paper">
          + Criar conta de prestador
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-xs uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Segmento</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3">Último login</th>
              <th className="px-4 py-3">Orçamentos</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(empresas ?? []).map((empresa) => {
              const usuario = usuarioPorEmpresa.get(empresa.id)
              const email = usuario ? emailPorUsuarioId.get(usuario.id) : null
              const ultimoLogin = ultimoLoginPorEmpresa.get(empresa.id)
              const qtdOrcamentos = orcamentosPorEmpresa.get(empresa.id) ?? 0
              const dias = diasAteVencimento(empresa.data_vencimento)
              const vencido = dias < 0
              const proximoDoVencimento = dias >= 0 && dias <= 5
              const bloqueadoEfetivo = !empresa.ativo || vencido

              return (
                <tr key={empresa.id} className="border-b border-dotted border-line align-top">
                  <td className="px-4 py-3 font-bold text-blueprint-deep">{empresa.nome}</td>
                  <td className="px-4 py-3">{SEGMENTOS[empresa.segmento_padrao]?.label ?? empresa.segmento_padrao}</td>
                  <td className="px-4 py-3">{email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-sm px-2 py-1 text-xs font-bold uppercase ${bloqueadoEfetivo ? 'bg-danger/10 text-danger' : 'bg-brass-soft text-blueprint-deep'}`}>
                      {bloqueadoEfetivo ? (vencido && empresa.ativo ? 'Vencido' : 'Bloqueado') : 'Ativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-mono-num text-xs ${vencido ? 'font-bold text-danger' : proximoDoVencimento ? 'font-bold text-brass' : 'text-ink-soft'}`}>
                      {new Date(empresa.data_vencimento).toLocaleDateString('pt-BR')}
                      {vencido && ' · vencido'}
                      {proximoDoVencimento && ` · vence em ${dias}d`}
                    </span>
                  </td>
                  <td className="font-mono-num px-4 py-3 text-xs">{new Date(empresa.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="font-mono-num px-4 py-3 text-xs">{ultimoLogin ? new Date(ultimoLogin).toLocaleString('pt-BR') : '—'}</td>
                  <td className="font-mono-num px-4 py-3">{qtdOrcamentos}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-2">
                      <Link href={`/admin/${empresa.id}`} className="text-xs font-bold text-brass underline">Ver serviços</Link>
                      <form action={alternarStatus}>
                        <input type="hidden" name="empresaId" value={empresa.id} />
                        <input type="hidden" name="ativo" value={String(empresa.ativo)} />
                        <button type="submit" className={`text-xs font-bold underline ${empresa.ativo ? 'text-danger' : 'text-blueprint-deep'}`}>
                          {empresa.ativo ? 'Bloquear' : 'Desbloquear'}
                        </button>
                      </form>
                      <form action={renovar} className="flex items-center gap-1.5">
                        <input type="hidden" name="empresaId" value={empresa.id} />
                        <input type="date" name="novaData" defaultValue={vencimentoPadrao} className="font-mono-num w-32 border-b border-line bg-transparent py-0.5 text-xs outline-none focus:border-brass" />
                        <button type="submit" className="text-xs font-bold text-blueprint-deep underline">Renovar</button>
                      </form>
                      <ExcluirEmpresaButton empresaId={empresa.id} empresaNome={empresa.nome} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}
