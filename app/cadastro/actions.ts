'use server'

import { randomUUID } from 'crypto'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SEGMENTOS } from '@/lib/segmentos-seed'
import type { SegmentoKey } from '@/lib/types'

export async function cadastrar(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get('email') ?? '')
  const senha = String(formData.get('senha') ?? '')
  const nomeUsuario = String(formData.get('nomeUsuario') ?? '')
  const nomeEmpresa = String(formData.get('nomeEmpresa') ?? '')
  const cnpj = String(formData.get('cnpj') ?? '')
  const telefone = String(formData.get('telefone') ?? '')
  const segmento = String(formData.get('segmento') ?? 'geral') as SegmentoKey

  if (!email || !senha || !nomeUsuario || !nomeEmpresa || !cnpj || !telefone) {
    return { error: 'Preencha todos os campos.' }
  }

  const supabase = await createClient()

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password: senha })
  if (signUpError || !signUpData.user) {
    return { error: signUpError?.message ?? 'Não foi possível criar a conta.' }
  }

  const seed = SEGMENTOS[segmento]

  // id generated client-side and inserted without `.select()`: at this point the
  // caller has no usuarios row yet, so empresas_select_own (id = auth_empresa_id())
  // can't pass — and INSERT...RETURNING enforces the SELECT policy on top of the
  // INSERT policy. Supplying the id ourselves avoids needing RETURNING at all.
  const empresaId = randomUUID()
  const { error: empresaError } = await supabase
    .from('empresas')
    .insert({ id: empresaId, nome: nomeEmpresa, cnpj, telefone, segmento_padrao: segmento, bdi_padrao: seed.bdiPadrao })
  if (empresaError) {
    return { error: empresaError.message ?? 'Não foi possível criar a empresa.' }
  }

  const { error: usuarioError } = await supabase
    .from('usuarios')
    .insert({ id: signUpData.user.id, empresa_id: empresaId, nome: nomeUsuario })
  if (usuarioError) {
    return { error: usuarioError.message }
  }

  redirect('/dashboard')
}
