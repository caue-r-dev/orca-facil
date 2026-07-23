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
  const segmento = String(formData.get('segmento') ?? 'geral') as SegmentoKey

  if (!email || !senha || !nomeUsuario || !nomeEmpresa) {
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
    .insert({ id: empresaId, nome: nomeEmpresa, segmento_padrao: segmento, bdi_padrao: seed.bdiPadrao })
  if (empresaError) {
    return { error: empresaError.message ?? 'Não foi possível criar a empresa.' }
  }

  const { error: usuarioError } = await supabase
    .from('usuarios')
    .insert({ id: signUpData.user.id, empresa_id: empresaId, nome: nomeUsuario })
  if (usuarioError) {
    return { error: usuarioError.message }
  }

  if (seed.itens.length > 0) {
    const { error: bibliotecaError } = await supabase.from('itens_biblioteca_empresa').insert(
      seed.itens.map((item) => ({
        empresa_id: empresaId,
        descricao: item.descricao,
        categoria: item.categoria,
        unidade: item.unidade,
        valor_unit_padrao: item.valorUnitPadrao,
      }))
    )
    if (bibliotecaError) {
      return { error: bibliotecaError.message }
    }
  }

  redirect('/dashboard')
}
