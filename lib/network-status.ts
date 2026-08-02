// Patch de window.fetch pra emitir 'app:network-error' quando uma
// requisição falha por falta de rede de verdade (TypeError: Failed to
// fetch) — cobre o caso em que navigator.onLine ainda reporta true mas
// não há sinal real (comum em wifi "conectado sem internet"). Chamado
// uma única vez a partir de OfflineBanner.
let patched = false

export function iniciarDeteccaoDeRede() {
  if (patched || typeof window === 'undefined') return
  patched = true
  const fetchOriginal = window.fetch
  window.fetch = async (...args) => {
    try {
      const resposta = await fetchOriginal(...args)
      return resposta
    } catch (erro) {
      if (erro instanceof TypeError) {
        window.dispatchEvent(new Event('app:network-error'))
      }
      throw erro
    }
  }
}
