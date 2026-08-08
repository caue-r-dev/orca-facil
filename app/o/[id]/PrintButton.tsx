'use client'

import { useState } from 'react'

// Gera o PDF direto no navegador a partir do DOM renderizado
// (html2canvas + jsPDF), em vez de depender do diálogo de impressão do
// navegador — elimina de vez a variável "escala Padrão vs Customizada"
// que causava corte/espaço em branco conforme o navegador/impressora do
// usuário: aqui o PDF sai sempre com a mesma largura A4, e a proposta
// inteira é encolhida (se preciso) pra caber sempre em 1 única página.
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

      // windowWidth força o html2canvas a clonar/renderizar o DOM como se
      // a janela fosse desktop (1024px), independente da largura real do
      // dispositivo que está gerando o PDF. Sem isso, no mobile o clone
      // herda o viewport estreito da tela, os breakpoints sm: não ativam
      // e as colunas em grid (fr) ficam apertadas — texto quebra em mais
      // linhas e o PDF estoura pra 2-3 páginas.
      const LARGURA_JANELA_CAPTURA = 1024
      const canvas = await html2canvas(elemento, {
        scale: 2,
        backgroundColor: '#F5F2EB',
        useCORS: true,
        windowWidth: LARGURA_JANELA_CAPTURA,
        windowHeight: elemento.scrollHeight,
      })
      const imagem = canvas.toDataURL('image/jpeg', 0.95)

      const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
      const larguraPagina = pdf.internal.pageSize.getWidth()
      const alturaPagina = pdf.internal.pageSize.getHeight()
      let larguraImagem = larguraPagina
      let alturaImagem = (canvas.height * larguraPagina) / canvas.width

      // A proposta é sempre 1 página — nunca gera addPage(). Se o
      // conteúdo capturado passar da altura da A4, encolhe a imagem
      // inteira (mantendo a proporção) até caber, em vez de estourar
      // pra uma 2ª página com só rodapé/assinatura e muito espaço em
      // branco.
      if (alturaImagem > alturaPagina) {
        const fator = alturaPagina / alturaImagem
        larguraImagem *= fator
        alturaImagem *= fator
      }

      const deslocamentoX = (larguraPagina - larguraImagem) / 2
      pdf.addImage(imagem, 'JPEG', deslocamentoX, 0, larguraImagem, alturaImagem)

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
