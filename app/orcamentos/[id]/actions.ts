'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { OrcamentoBuilderPayload } from '@/components/OrcamentoBuilder'

export async function atualizarOrcamento(orcamentoId: string, payload: OrcamentoBuilderPayload): Promise<{ error?: string }> {
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
      bdi: payload.bdi,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orcamentoId)

  if (orcamentoError) {
    return { error: orcamentoError.message }
  }

  const { error: deleteError } = await supabase.from('itens_orcamento').delete().eq('orcamento_id', orcamentoId)
  if (deleteError) {
    return { error: deleteError.message }
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
    }))
  )
  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath(`/orcamentos/${orcamentoId}`)
  return {}
}
