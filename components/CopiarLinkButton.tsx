'use client'

import { useState } from 'react'

export function CopiarLinkButton({ caminho, className }: { caminho: string; className?: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    const url = `${window.location.origin}${caminho}`
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <button onClick={copiar} className={className ?? 'text-sm font-bold text-brass underline'}>
      {copiado ? 'Link copiado!' : 'Copiar link'}
    </button>
  )
}
