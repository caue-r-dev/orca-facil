'use client'

import { useEffect } from 'react'

// px -> mm a 96dpi (padrão CSS).
const PX_POR_MM = 96 / 25.4
const MARGEM_PAGINA_MM = 14
// Folga pra absorver a diferença entre o padding em tela (px-8 py-9) e o
// padding de impressão (print:px-6 print:py-6) medidos antes do @media
// print entrar em vigor — evita cortar conteúdo por um cálculo justo demais.
const FOLGA_MM = 8

export function PrintButton() {
  // 'beforeprint' cobre tanto o clique no botão quanto Ctrl+P/menu do
  // navegador — a altura da página é sempre ajustada ao conteúdo real,
  // não só quando a impressão é disparada por aqui.
  useEffect(() => {
    let styleTag: HTMLStyleElement | null = null

    function ajustarAlturaPagina() {
      const conteudo = document.getElementById('proposta-preview')
      if (!conteudo) return
      const alturaPaginaMm = Math.ceil(conteudo.scrollHeight / PX_POR_MM + MARGEM_PAGINA_MM * 2 + FOLGA_MM)
      styleTag = document.createElement('style')
      // Sobrescreve só o size do @page global (que continua fornecendo o
      // margin): página com largura A4 fixa mas altura ajustada ao
      // conteúdo real, pra não sobrar papel em branco embaixo quando a
      // proposta é curta.
      styleTag.textContent = `@media print { @page { size: 210mm ${alturaPaginaMm}mm; } }`
      document.head.appendChild(styleTag)
    }

    function limparAlturaPagina() {
      styleTag?.remove()
      styleTag = null
    }

    window.addEventListener('beforeprint', ajustarAlturaPagina)
    window.addEventListener('afterprint', limparAlturaPagina)
    return () => {
      window.removeEventListener('beforeprint', ajustarAlturaPagina)
      window.removeEventListener('afterprint', limparAlturaPagina)
      limparAlturaPagina()
    }
  }, [])

  return (
    <button onClick={() => window.print()} className="no-print mt-5 rounded-sm bg-blueprint-deep px-5 py-3 font-sans font-bold text-paper">
      Gerar PDF
    </button>
  )
}
