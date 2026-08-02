'use client'

import { useEffect, useState } from 'react'
import { iniciarDeteccaoDeRede } from '@/lib/network-status'

// Detecta offline de duas formas: o evento nativo online/offline (cobre
// desligar/ligar Wi-Fi ou modo avião) e uma falha de fetch de rede real
// (cobre casos em que o navegador ainda reporta onLine=true mas a
// requisição falha por falta de sinal de fato) — ver window dispatch em
// lib/network-status.ts.
export function OfflineBanner() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    iniciarDeteccaoDeRede()
    setOffline(!navigator.onLine)
    function aoFicarOffline() {
      setOffline(true)
    }
    function aoFicarOnline() {
      setOffline(false)
    }
    window.addEventListener('offline', aoFicarOffline)
    window.addEventListener('online', aoFicarOnline)
    window.addEventListener('app:network-error', aoFicarOffline)
    return () => {
      window.removeEventListener('offline', aoFicarOffline)
      window.removeEventListener('online', aoFicarOnline)
      window.removeEventListener('app:network-error', aoFicarOffline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="no-print bg-[#FAEEDA] px-4 py-2 text-center text-xs font-bold text-blueprint-deep">
      Sem conexão — mostrando última versão salva
    </div>
  )
}
