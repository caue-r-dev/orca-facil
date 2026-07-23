import { cadastrar } from './actions'
import { SEGMENTOS } from '@/lib/segmentos-seed'

export default function CadastroPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold text-blueprint-deep">Criar conta — Orça Fácil</h1>
      <form
        action={async (formData: FormData) => {
          'use server'
          await cadastrar(formData)
        }}
        className="mt-8 flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          Seu nome
          <input name="nomeUsuario" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Nome da empresa
          <input name="nomeEmpresa" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Segmento principal
          <select name="segmento" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass">
            {Object.entries(SEGMENTOS).map(([key, seg]) => (
              <option key={key} value={key}>{seg.label}</option>
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
        <button type="submit" className="mt-4 rounded-sm bg-blueprint-deep px-5 py-3 font-sans font-bold text-paper">
          Criar conta
        </button>
      </form>
    </main>
  )
}
