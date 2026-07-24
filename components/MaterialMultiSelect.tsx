'use client'

import { useEffect, useRef, useState } from 'react'
import type { ItemBiblioteca } from '@/lib/types'
import { formatarMoeda } from '@/lib/calc'

interface MaterialMultiSelectProps {
  materiais: ItemBiblioteca[]
  selecionados: string[]
  onChange: (ids: string[]) => void
}

export function MaterialMultiSelect({ materiais, selecionados, onChange }: MaterialMultiSelectProps) {
  const [aberto, setAberto] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [])

  function alternar(id: string) {
    onChange(selecionados.includes(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id])
  }

  const escolhidos = materiais.filter((m) => selecionados.includes(m.id))

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5 text-xs" style={{ maxWidth: '320px' }}>
      <span>Material por conta do prestador — soma ao valor do serviço</span>

      {/* wrapper próprio só pra botão+dropdown: se o popover ficasse
          relativo ao container inteiro, o chip que aparece embaixo ao
          marcar um material aumentaria a altura do container e
          empurraria o dropdown pra baixo entre um clique e outro. */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          className="w-full border-b border-line bg-white py-1 text-left outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          {escolhidos.length > 0 ? `${escolhidos.length} material${escolhidos.length > 1 ? 'is' : ''} selecionado${escolhidos.length > 1 ? 's' : ''}` : 'Selecione um ou mais materiais'}
        </button>

        {aberto && (
          <div className="absolute left-0 top-full z-10 mt-1 max-h-56 w-full overflow-y-auto border border-brand-border bg-white shadow-sm">
            {materiais.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-brand-bg">
                <input
                  type="checkbox"
                  checked={selecionados.includes(m.id)}
                  onChange={() => alternar(m.id)}
                  className="accent-brand-accent"
                />
                <span className="flex-1">{m.descricao}</span>
                <span className="font-mono-num text-[11px] text-brand-text-tertiary">{formatarMoeda(m.valor_unit_padrao)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {escolhidos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {escolhidos.map((m) => (
            <span key={m.id} className="flex items-center gap-1 border border-brand-border bg-white px-2 py-1 text-[11px]">
              {m.descricao} · {formatarMoeda(m.valor_unit_padrao)}
              <button
                type="button"
                onClick={() => alternar(m.id)}
                aria-label={`Remover ${m.descricao}`}
                className="font-bold text-brand-text-tertiary hover:text-danger"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
