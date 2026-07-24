'use server'

import { createClient } from '@/lib/supabase/server'

// itens_orcamento e ambientes_orcamento têm "on delete cascade" pra
// orcamentos (migrations 0001/0003) — apagar a linha aqui já limpa os
// filhos. RLS (orcamentos_all_own) garante que só dá pra apagar
// orçamento da própria empresa.
export async function apagarOrcamento(orcamentoId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('orcamentos').delete().eq('id', orcamentoId)
  if (error) return { error: error.message }
  return {}
}
