'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SegmentoKey } from '@/lib/types'

// Toda ação de admin roda com o service-role client (cross-tenant, sem
// RLS), mas só depois de confirmar via sessão normal que quem está
// chamando é de fato um usuário com role='admin' — mesmo padrão de
// guarda usado nas páginas do painel.
async function exigirAdmin(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('role').eq('id', user.id).single<{ role: string }>()
  if (!usuario || usuario.role !== 'admin') redirect('/dashboard')
}

export async function criarPrestador(formData: FormData): Promise<{ error?: string }> {
  await exigirAdmin()

  const email = String(formData.get('email') ?? '')
  const senha = String(formData.get('senha') ?? '')
  const nomeUsuario = String(formData.get('nomeUsuario') ?? '')
  const nomeEmpresa = String(formData.get('nomeEmpresa') ?? '')
  const cnpj = String(formData.get('cnpj') ?? '')
  const telefone = String(formData.get('telefone') ?? '')
  const segmento = String(formData.get('segmento') ?? 'geral') as SegmentoKey
  const dataVencimento = String(formData.get('dataVencimento') ?? '')

  if (!email || !senha || !nomeUsuario || !nomeEmpresa || !cnpj || !telefone || !dataVencimento) {
    return { error: 'Preencha todos os campos.' }
  }

  const admin = createAdminClient()

  const { data: criado, error: criarUserError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })
  console.error('[DEBUG] createUser result', criarUserError?.message, criado?.user?.id)
  if (criarUserError || !criado.user) {
    return { error: criarUserError?.message ?? 'Não foi possível criar o usuário.' }
  }

  const empresaId = randomUUID()
  const { error: empresaError } = await admin
    .from('empresas')
    .insert({ id: empresaId, nome: nomeEmpresa, cnpj, telefone, segmento_padrao: segmento, data_vencimento: dataVencimento })
  if (empresaError) {
    return { error: empresaError.message }
  }

  const { error: usuarioError } = await admin
    .from('usuarios')
    .insert({ id: criado.user.id, empresa_id: empresaId, nome: nomeUsuario, role: 'prestador' })
  if (usuarioError) {
    return { error: usuarioError.message }
  }

  redirect('/admin')
}

export async function bloquearEmpresa(empresaId: string): Promise<void> {
  await exigirAdmin()
  const admin = createAdminClient()
  await admin.from('empresas').update({ ativo: false }).eq('id', empresaId)
  revalidatePath('/admin')
}

export async function desbloquearEmpresa(empresaId: string): Promise<void> {
  await exigirAdmin()
  const admin = createAdminClient()
  await admin.from('empresas').update({ ativo: true }).eq('id', empresaId)
  revalidatePath('/admin')
}

// Renova assinatura: empurra o vencimento pra frente (data escolhida,
// ou +30 dias a partir de hoje se não informada) e reativa o acesso —
// cobre tanto bloqueio automático por vencimento quanto manual.
export async function renovarAcesso(empresaId: string, novaData?: string): Promise<void> {
  await exigirAdmin()
  const admin = createAdminClient()
  const dataVencimento = novaData || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  await admin.from('empresas').update({ data_vencimento: dataVencimento, ativo: true }).eq('id', empresaId)
  revalidatePath('/admin')
}
