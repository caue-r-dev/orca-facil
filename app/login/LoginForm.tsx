'use client'

import { useState } from 'react'
import { entrar } from './actions'

export function LoginForm() {
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function acao(formData: FormData) {
    setErro(null)
    setEnviando(true)
    const resultado = await entrar(formData)
    setEnviando(false)
    if (resultado?.error) setErro(resultado.error)
  }

  return (
    <form action={acao} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input type="email" name="email" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Senha
        <input type="password" name="senha" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
      </label>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <button type="submit" disabled={enviando} className="mt-4 rounded-sm bg-blueprint-deep px-5 py-3 font-sans font-bold text-paper disabled:opacity-50">
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
