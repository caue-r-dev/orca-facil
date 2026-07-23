'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Categoria } from '@/lib/types'

export async function atualizarEmpresa(
  empresaId: string,
  dados: { nome: string; cnpj: string; telefone: string; bdiPadrao: number }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('empresas')
    .update({ nome: dados.nome, cnpj: dados.cnpj || null, telefone: dados.telefone || null, bdi_padrao: dados.bdiPadrao })
    .eq('id', empresaId)
  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return {}
}

const EXTENSOES_PERMITIDAS = new Set(['png', 'jpg', 'jpeg', 'svg', 'webp'])

export async function atualizarLogo(empresaId: string, formData: FormData): Promise<{ error?: string }> {
  const arquivo = formData.get('logo')
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { error: 'Selecione um arquivo de imagem.' }
  }

  const extensao = (arquivo.name.split('.').pop() ?? '').toLowerCase()
  if (!EXTENSOES_PERMITIDAS.has(extensao)) {
    return { error: 'Formato não suportado. Use PNG, JPG, SVG ou WebP.' }
  }

  const supabase = await createClient()
  const caminho = `${empresaId}/logo.${extensao}`

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(caminho, arquivo, { upsert: true, cacheControl: '3600' })
  if (uploadError) {
    return { error: uploadError.message }
  }

  const { data: publico } = supabase.storage.from('logos').getPublicUrl(caminho)
  // cache-bust: mesmo caminho é reaproveitado (upsert), então sem isso o
  // navegador continuaria servindo a logo antiga do cache depois de trocar.
  const logoUrl = `${publico.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase.from('empresas').update({ logo_url: logoUrl }).eq('id', empresaId)
  if (updateError) {
    return { error: updateError.message }
  }

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
  revalidatePath('/materiais')
  return {}
}

export async function removerItemBiblioteca(itemId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('itens_biblioteca_empresa').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  revalidatePath('/materiais')
  return {}
}
