'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Categoria } from '@/lib/types'

export async function atualizarEmpresa(
  empresaId: string,
  dados: { nome: string; telefone: string; bdiPadrao: number }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('empresas')
    .update({ nome: dados.nome, telefone: dados.telefone || null, bdi_padrao: dados.bdiPadrao })
    .eq('id', empresaId)
  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return {}
}

export async function adicionarItemBiblioteca(
  empresaId: string,
  item: { descricao: string; categoria: Categoria; unidade: string; valorUnitPadrao: number }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('itens_biblioteca_empresa').insert({
    empresa_id: empresaId,
    descricao: item.descricao,
    categoria: item.categoria,
    unidade: item.unidade,
    valor_unit_padrao: item.valorUnitPadrao,
  })
  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return {}
}

export async function removerItemBiblioteca(itemId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('itens_biblioteca_empresa').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return {}
}
