import './globals.css'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
          <nav className="no-print bg-blueprint-deep px-6 py-3 text-paper">
            <div className="mx-auto flex max-w-6xl items-center justify-between text-sm">
              <div className="flex gap-5">
                {isAdmin ? (
                  <Link href="/admin">Admin</Link>
                ) : (
                  <>
                    <Link href="/dashboard">Dashboard</Link>
                    <Link href="/orcamentos/novo">Novo orçamento</Link>
                    <Link href="/materiais">Materiais</Link>
                    <Link href="/configuracoes">Configurações</Link>
                  </>
                )}
              </div>
              <form action={sair}>
                <button type="submit" className="opacity-80">Sair</button>
              </form>
            </div>
          </nav>
        )}
        {children}
      </body>
    </html>
  )
}
