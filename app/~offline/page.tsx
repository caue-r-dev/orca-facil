export const metadata = {
  title: 'Sem conexão — Orça Fácil',
}

export default function OfflinePage() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-bold text-blueprint-deep">Sem conexão</h1>
      <p className="text-sm text-ink-soft">
        Essa página ainda não foi aberta neste dispositivo enquanto havia internet, então não está disponível
        offline. Conecte-se à internet e tente novamente.
      </p>
      <p className="text-xs text-ink-soft">
        Orçamentos e propostas já abertos anteriormente continuam acessíveis mesmo sem conexão.
      </p>
    </main>
  )
}
