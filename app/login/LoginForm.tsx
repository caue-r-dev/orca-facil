'use client'

import { useState } from 'react'
import Image from 'next/image'
import { entrar } from './actions'

function CornerMarks() {
  const line = 'absolute bg-brand-text'
  return (
    <>
      <span className={`${line} left-[-1px] top-[-1px] h-[2px] w-[18px]`} />
      <span className={`${line} left-[-1px] top-[-1px] h-[18px] w-[2px]`} />
      <span className={`${line} right-[-1px] top-[-1px] h-[2px] w-[18px]`} />
      <span className={`${line} right-[-1px] top-[-1px] h-[18px] w-[2px]`} />
      <span className={`${line} left-[-1px] bottom-[-1px] h-[2px] w-[18px]`} />
      <span className={`${line} left-[-1px] bottom-[-1px] h-[18px] w-[2px]`} />
      <span className={`${line} right-[-1px] bottom-[-1px] h-[2px] w-[18px]`} />
      <span className={`${line} right-[-1px] bottom-[-1px] h-[18px] w-[2px]`} />
    </>
  )
}

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
    <div className="relative w-full max-w-[380px] border border-brand-border bg-white p-10">
      <CornerMarks />

      <div className="flex flex-col items-center">
        <Image src="/icons/icon-512x512.png" alt="Orça Fácil" width={52} height={52} priority />
        <p className="label-mono mt-4 text-brand-text-tertiary">Orça Fácil</p>
        <h1 className="mt-1 font-serif-body text-[22px] font-medium text-brand-text">Entrar</h1>
      </div>

      <form action={acao} className="mt-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="label-mono">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            placeholder="nome@empresa.com"
            className="w-full border-0 border-b border-brand-border-input bg-transparent py-1 text-[15px] text-brand-text outline-none transition-colors focus:border-brand-accent placeholder:text-brand-text-tertiary"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="senha" className="label-mono">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            name="senha"
            required
            placeholder="••••••••"
            className="w-full border-0 border-b border-brand-border-input bg-transparent py-1 text-[15px] text-brand-text outline-none transition-colors focus:border-brand-accent placeholder:text-brand-text-tertiary"
          />
        </div>

        {erro && <p className="text-sm text-danger">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="mt-3 w-full border-[1.5px] border-brand-text bg-brand-accent px-5 py-[13px] font-medium text-white transition hover:brightness-[0.92] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-text disabled:opacity-50"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
