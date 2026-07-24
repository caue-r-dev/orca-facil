'use client'

import { useState } from 'react'

// Gera o PDF direto no navegador a partir do DOM renderizado
// (html2canvas + jsPDF), em vez de depender do diálogo de impressão do
// navegador — elimina de vez a variável "escala Padrão vs Customizada"
// que causava corte/espaço em branco conforme o navegador/impressora do
// usuário: aqui o PDF sai sempre com a mesma largura A4 e altura
// paginada automaticamente a partir da imagem capturada.
export function PrintButton() {
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function gerarPdf() {
    setErro(null)
    setGerando(true)
    try {
      const elemento = document.getElementById('proposta-preview')
      if (!elemento) throw new Error('Elemento da proposta não encontrado.')

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const canvas = await html2canvas(elemento, { scale: 2, backgroundColor: '#F5F2EB', useCORS: true })
      const imagem = canvas.toDataURL('image/jpeg', 0.95)

      const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
      const larguraPagina = pdf.internal.pageSize.getWidth()
      const alturaPagina = pdf.internal.pageSize.getHeight()
      let larguraImagem = larguraPagina
      let alturaImagem = (canvas.height * larguraPagina) / canvas.width

      // Se sobrar só um resto pequeno pra última página (ex: só o
      // rodapé), comprime a imagem inteira o suficiente pra caber com
      // uma página a menos, em vez de gerar uma página quase em branco
      // só por uma linha de texto.
      const ORFAO_LIMITE_MM = 25
      const paginasSemAjuste = Math.ceil(alturaImagem / alturaPagina)
      if (paginasSemAjuste > 1) {
        const restoUltimaPagina = alturaImagem - (paginasSemAjuste - 1) * alturaPagina
        if (restoUltimaPagina < ORFAO_LIMITE_MM) {
          const fator = ((paginasSemAjuste - 1) * alturaPagina) / alturaImagem
          larguraImagem *= fator
          alturaImagem *= fator
        }
      }

      const deslocamentoX = (larguraPagina - larguraImagem) / 2
      let alturaRestante = alturaImagem
      let posicaoY = 0
      pdf.addImage(imagem, 'JPEG', deslocamentoX, posicaoY, larguraImagem, alturaImagem)
      alturaRestante -= alturaPagina

      while (alturaRestante > 0) {
        posicaoY = alturaRestante - alturaImagem
        pdf.addPage()
        pdf.addImage(imagem, 'JPEG', deslocamentoX, posicaoY, larguraImagem, alturaImagem)
        alturaRestante -= alturaPagina
      }

      pdf.save('proposta-de-orcamento.pdf')
    } catch {
      setErro('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="no-print mt-5">
      <button onClick={gerarPdf} disabled={gerando} className="btn-primary px-5 py-3">
        {gerando ? 'Gerando PDF…' : 'Gerar PDF'}
      </button>
      {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
    </div>
  )
}
