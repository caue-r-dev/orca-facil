import { entrar } from './actions'

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold text-blueprint-deep">Entrar — Orça Fácil</h1>
      <form
        action={async (formData: FormData) => {
          'use server'
          await entrar(formData)
        }}
        className="mt-8 flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input type="email" name="email" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input type="password" name="senha" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <button type="submit" className="mt-4 rounded-sm bg-blueprint-deep px-5 py-3 font-sans font-bold text-paper">
          Entrar
        </button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Não tem conta? <a href="/cadastro" className="text-brass underline">Cadastre-se</a>
      </p>
    </main>
  )
}
