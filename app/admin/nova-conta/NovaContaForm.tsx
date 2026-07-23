'use client'

import { useState } from 'react'
import { SEGMENTOS } from '@/lib/segmentos-seed'
import { criarPrestador } from '../actions'

const SEGMENTOS_CADASTRO = ['eletrica', 'hidraulica', 'construcao', 'drywall'] as const

export function NovaContaForm({ vencimentoPadrao }: { vencimentoPadrao: string }) {
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

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
        <select name="segmento" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass">
          {SEGMENTOS_CADASTRO.map((key) => (
            <option key={key} value={key}>{SEGMENTOS[key].label}</option>
          ))}
        </select>
      </label>
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
      <button type="submit" disabled={enviando} className="mt-4 rounded-sm bg-blueprint-deep px-5 py-3 font-sans font-bold text-paper disabled:opacity-50">
        {enviando ? 'Criando…' : 'Criar conta'}
      </button>
    </form>
  )
}
