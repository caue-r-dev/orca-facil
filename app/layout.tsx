import './globals.css'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NavLinks } from '@/components/NavLinks'

export const metadata = {
  title: 'Orça Fácil',
  description: 'Orçamentos profissionais para prestadores de serviço',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#F5A623',
}

async function sair() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isAdmin = false
  if (user) {
    const { data: usuario } = await supabase.from('usuarios').select('role').eq('id', user.id).single<{ role: string }>()
    isAdmin = usuario?.role === 'admin'
  }

  return (
    <html lang="pt-BR">
      <body>
        {user && (
          <nav className="no-print bg-brand-text px-6 py-3">
            <div className="mx-auto flex max-w-6xl items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent">
                  <Image src="/icons/icon-512x512.png" alt="" width={24} height={24} />
                  <span className="font-serif-body text-[15px] text-brand-bg">Orça Fácil</span>
                </Link>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="border-b-2 border-brand-accent pb-1 text-sm text-brand-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
                  >
                    Admin
                  </Link>
                ) : (
                  <NavLinks />
                )}
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
          </nav>
        )}
        {children}
      </body>
    </html>
  )
}
