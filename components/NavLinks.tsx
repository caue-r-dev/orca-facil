'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/orcamentos/novo', label: 'Novo orçamento' },
  { href: '/materiais', label: 'Materiais' },
  { href: '/configuracoes', label: 'Configurações' },
]

const adminLinks = [{ href: '/admin', label: 'Admin' }]

interface NavLinksProps {
  isAdmin: boolean
  sair: () => Promise<void>
}

export function NavLinks({ isAdmin, sair }: NavLinksProps) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const itens = isAdmin ? adminLinks : links

  function ativo(href: string) {
    return pathname === href || pathname?.startsWith(`${href}/`)
  }

  return (
    <>
      {/* Desktop: logo + links + Sair numa linha só */}
      <div className="hidden items-center gap-6 sm:flex">
        <div className="flex gap-5">
          {itens.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`pb-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent ${
                ativo(link.href)
                  ? 'border-b-2 border-brand-accent text-brand-accent'
                  : 'border-b-2 border-transparent text-brand-nav-link'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <form action={sair}>
          <button
            type="submit"
            className="text-[13px] text-brand-text-tertiary transition-colors hover:text-brand-nav-link focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
          >
            Sair
          </button>
        </form>
      </div>

      {/* Mobile: botão hambúrguer */}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={aberto}
        className="flex items-center justify-center text-brand-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent sm:hidden"
      >
        {aberto ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile: lista suspensa */}
      {aberto && (
        <div className="absolute inset-x-0 top-14 z-10 flex flex-col border-t border-brand-nav-divider bg-brand-text sm:hidden">
          {itens.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setAberto(false)}
              className={`border-l-[3px] px-5 py-3 text-sm ${
                ativo(link.href)
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-brand-nav-link'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <form action={sair} className="mt-1 border-t border-brand-nav-divider">
            <button
              type="submit"
              onClick={() => setAberto(false)}
              className="w-full px-5 py-3 text-left text-[13px] text-brand-text-tertiary"
            >
              Sair
            </button>
          </form>
        </div>
      )}
    </>
  )
}
