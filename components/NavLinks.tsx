'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/orcamentos/novo', label: 'Novo orçamento' },
  { href: '/materiais', label: 'Materiais' },
  { href: '/configuracoes', label: 'Configurações' },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <div className="flex gap-5">
      {links.map((link) => {
        const ativo = pathname === link.href || pathname?.startsWith(`${link.href}/`)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`pb-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent ${
              ativo
                ? 'border-b-2 border-brand-accent text-brand-accent'
                : 'border-b-2 border-transparent text-brand-nav-link'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
