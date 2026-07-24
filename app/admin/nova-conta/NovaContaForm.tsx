'use client'

import { useState } from 'react'
import { SEGMENTOS } from '@/lib/segmentos-seed'
import { criarPrestador } from '../actions'

const SEGMENTOS_CADASTRO = ['eletrica', 'hidraulica', 'construcao', 'drywall'] as const

// Só um ponto de partida sensato pro toggle ao trocar o preset — o
// admin continua livre pra mudar antes de enviar, já que o campo é
// independente do nome do segmento.
const TEM_PAREDE_PADRAO: Record<string, boolean> = {
  eletrica: false,
  hidraulica: false,
  construcao: true,
  drywall: true,
  outro: false,
}

export function NovaContaForm({ vencimentoPadrao }: { vencimentoPadrao: string }) {
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [segmento, setSegmento] = useState<string>('eletrica')
  const [temParede, setTemParede] = useState(false)

  async function acao(formData: FormData) {
    setErro(null)
    setEnviando(true)
    const resultado = await criarPrestador(formData)
    setEnviando(false)
    if (resultado?.error) setErro(resultado.error)
  }

  return (
    <form action={acao} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Nome completo
        <input name="nomeUsuario" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Nome da empresa
        <input name="nomeEmpresa" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        CNPJ
        <input name="cnpj" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Telefone
        <input name="telefone" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Segmento principal
        <select
          name="segmento"
          required
          value={segmento}
          onChange={(e) => { setSegmento(e.target.value); setTemParede(TEM_PAREDE_PADRAO[e.target.value] ?? false) }}
          className="border-b border-line bg-transparent py-1 outline-none focus:border-brass"
        >
          {SEGMENTOS_CADASTRO.map((key) => (
            <option key={key} value={key}>{SEGMENTOS[key].label}</option>
          ))}
          <option value="outro">Outro (digitar abaixo)</option>
        </select>
      </label>
      {segmento === 'outro' && (
        <label className="flex flex-col gap-1 text-sm">
          Nome do segmento
          <input name="segmentoCustom" required placeholder="ex: Ar Condicionado, Marcenaria, Chaveiro" className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="temParede" checked={temParede} onChange={(e) => setTemParede(e.target.checked)} />
        Este segmento trabalha com parede/pé-direito?
      </label>
      <p className="-mt-2 text-xs text-ink-soft">Se marcado, o Ambiente mostra Pé-direito e Área de parede além de comprimento/largura/área. Independente do nome do segmento.</p>
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input type="email" name="email" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input type="password" name="senha" required minLength={6} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Vencimento da assinatura
        <input type="date" name="dataVencimento" required defaultValue={vencimentoPadrao} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
      </label>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <button type="submit" disabled={enviando} className="btn-primary mt-4 px-5 py-3">
        {enviando ? 'Criando…' : 'Criar conta'}
      </button>
    </form>
  )
}
