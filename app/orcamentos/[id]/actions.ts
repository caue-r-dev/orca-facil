'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { OrcamentoBuilderPayload } from '@/components/OrcamentoBuilder'

export async function atualizarOrcamento(orcamentoId: string, payload: OrcamentoBuilderPayload): Promise<{ error?: string }> {
  try {
    return await atualizarOrcamentoInterno(orcamentoId, payload)
  } catch (e) {
    // Mesmo raciocínio de app/orcamentos/novo/actions.ts: nunca deixar
    // a action "sumir" sem retornar nada pro client em caso de erro
    // inesperado.
    return { error: e instanceof Error ? e.message : 'Não foi possível salvar o orçamento.' }
  }
}

async function atualizarOrcamentoInterno(orcamentoId: string, payload: OrcamentoBuilderPayload): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error: orcamentoError } = await supabase
    .from('orcamentos')
    .update({
      cliente_nome: payload.clienteNome,
      cliente_contato: payload.clienteContato || null,
      obra_endereco: payload.obraEndereco || null,
      prazo_execucao: payload.prazoExecucao || null,
      validade_dias: payload.validadeDias,
      forma_pagamento: payload.formaPagamento || null,
      bdi: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orcamentoId)

  if (orcamentoError) {
    return { error: orcamentoError.message }
  }

  const { error: deleteItensError } = await supabase.from('itens_orcamento').delete().eq('orcamento_id', orcamentoId)
  if (deleteItensError) {
    return { error: deleteItensError.message }
  }

  const { error: deleteAmbientesError } = await supabase.from('ambientes_orcamento').delete().eq('orcamento_id', orcamentoId)
  if (deleteAmbientesError) {
    return { error: deleteAmbientesError.message }
  }

  const ambienteIdPorLocalId = new Map<number, string>()
  if (payload.ambientes.length > 0) {
    const { data: ambientesInseridos, error: ambientesError } = await supabase
      .from('ambientes_orcamento')
      .insert(
        payload.ambientes.map((a) => ({
          orcamento_id: orcamentoId,
          nome: a.nome,
          comprimento: a.comprimento,
          largura: a.largura,
          pe_direito: a.peDireito,
        }))
      )
      .select('id')

    if (ambientesError || !ambientesInseridos) {
      return { error: ambientesError?.message ?? 'Não foi possível salvar os ambientes.' }
    }
    payload.ambientes.forEach((a, i) => ambienteIdPorLocalId.set(a.localId, ambientesInseridos[i].id))
  }

  const { error: insertError } = await supabase.from('itens_orcamento').insert(
    payload.itens.map((it) => ({
      orcamento_id: orcamentoId,
      descricao: it.descricao,
      categoria: it.categoria,
      unidade: it.unidade,
      modo_medicao: it.modo_medicao,
      comprimento: it.comprimento,
      altura: it.altura,
      quantidade: it.quantidade,
      valor_unit: it.valor_unit,
      ambiente_id: it.ambienteLocalId !== null ? ambienteIdPorLocalId.get(it.ambienteLocalId) ?? null : null,
      origem_ambiente: it.origem_ambiente,
      material_item_id: it.materialItemId,
      valor_material: it.valorMaterial,
    }))
  )
  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath(`/orcamentos/${orcamentoId}`)
  return {}
}

// Publica o orçamento: status 'rascunho' → 'enviado'. A proposta
// pública em /o/[id] já é acessível pelo link independente do status
// (nunca teve checagem de status) — publicar é o que dá ao prestador
// um sinal claro de "isso já foi mandado pro cliente", pra distinguir
// de rascunhos ainda em edição na listagem do Dashboard.
export async function publicarOrcamento(orcamentoId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('orcamentos').update({ status: 'enviado' }).eq('id', orcamentoId)
  if (error) return { error: error.message }
  revalidatePath(`/orcamentos/${orcamentoId}`)
  revalidatePath('/dashboard')
  return {}
}
