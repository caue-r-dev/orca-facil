import withPWAInit from '@ducanh2912/next-pwa'

// As páginas de orçamento/proposta são Server Components — o navegador
// nunca chama a REST do Supabase diretamente, quem faz isso é a função
// serverless durante o SSR. Pro navegador, "abrir uma proposta" é uma
// requisição GET same-origin pra própria rota Next.js (navegação cheia
// OU fetch do payload de RSC em navegação client-side). Por isso o
// cache de "dados" nessa arquitetura precisa mirar essas rotas — não
// um endpoint supabase.co, que o navegador nunca chega a acessar.
// Network-first: tenta a rede, cai pro cache só quando offline/falha.
const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  extendDefaultRuntimeCaching: true,
  fallbacks: {
    document: '/~offline',
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: ({ sameOrigin, url }) =>
          sameOrigin && (
            url.pathname.startsWith('/o/') ||
            url.pathname.startsWith('/orcamentos') ||
            url.pathname === '/dashboard'
          ),
        handler: 'NetworkFirst',
        method: 'GET',
        options: {
          cacheName: 'paginas-orcamento',
          networkTimeoutSeconds: 8,
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default withPWA(nextConfig)
