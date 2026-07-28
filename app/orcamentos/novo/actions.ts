'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { OrcamentoBuilderPayload } from '@/components/OrcamentoBuilder'

export async function criarOrcamento(empresaId: string, payload: OrcamentoBuilderPayload): Promise<{ error?: string }> {
  try {
    return await criarOrcamentoInterno(empresaId, payload)
  } catch (e) {
    // redirect() bem-sucedido lança uma exceção especial com esse
    // digest — precisa continuar subindo pra o Next tratar a
    // navegação. Qualquer outra exceção não prevista (em vez de
    // deixar a action "sumir" sem retornar nada pro client) vira um
    // erro normal exibível na tela.
    if (e && typeof e === 'object' && 'digest' in e && typeof e.digest === 'string' && e.digest.startsWith('NEXT_REDIRECT')) {
      throw e
    }
    return { error: e instanceof Error ? e.message : 'Não foi possível salvar o orçamento.' }
  }
}

async function criarOrcamentoInterno(empresaId: string, payload: OrcamentoBuilderPayload): Promise<{ error?: string }> {
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
      ocultar_valor_unitario: payload.ocultarValorUnitario,
      bdi: 0,
      status: 'rascunho',
    })
    .select('id')
    .single()

  if (orcamentoError || !orcamento) {
    return { error: orcamentoError?.message ?? 'Não foi possível salvar o orçamento.' }
  }

  const ambienteIdPorLocalId = new Map<number, string>()
  if (payload.ambientes.length > 0) {
    const { data: ambientesInseridos, error: ambientesError } = await supabase
      .from('ambientes_orcamento')
      .insert(
        payload.ambientes.map((a) => ({
          orcamento_id: orcamento.id,
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

  const { error: itensError } = await supabase.from('itens_orcamento').insert(
    payload.itens.map((it) => ({
      orcamento_id: orcamento.id,
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
      material_item_ids: it.materialItemIds,
      valor_material: it.valor_material,
    }))
  )

  if (itensError) {
    return { error: itensError.message }
  }

  await supabase.from('eventos_uso').insert({ empresa_id: empresaId, tipo_evento: 'orcamento_criado' })

  redirect(`/orcamentos/${orcamento.id}`)
}
