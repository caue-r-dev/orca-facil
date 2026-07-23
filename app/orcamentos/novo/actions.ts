'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { OrcamentoBuilderPayload } from '@/components/OrcamentoBuilder'

export async function criarOrcamento(empresaId: string, payload: OrcamentoBuilderPayload): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: orcamento, error: orcamentoError } = await supabase
    .from('orcamentos')
    .insert({
      empresa_id: empresaId,
      cliente_nome: payload.clienteNome,
      cliente_contato: payload.clienteContato || null,
      obra_endereco: payload.obraEndereco || null,
      prazo_execucao: payload.prazoExecucao || null,
      validade_dias: payload.validadeDias,
      forma_pagamento: payload.formaPagamento || null,
      bdi: payload.bdi,
      status: 'rascunho',
    })
    .select('id')
    .single()

  if (orcamentoError || !orcamento) {
    return { error: orcamentoError?.message ?? 'Não foi possível salvar o orçamento.' }
  }

  const { error: itensError } = await supabase.from('itens_orcamento').insert(
    payload.itens.map((it) => ({
      orcamento_id: orcamento.id,
      descricao: it.descricao,
      categoria: it.categoria,
      unidade: it.unidade,
      quantidade: it.quantidade,
      valor_unit: it.valor_unit,
    }))
  )

  if (itensError) {
    return { error: itensError.message }
  }

  redirect(`/orcamentos/${orcamento.id}`)
}
