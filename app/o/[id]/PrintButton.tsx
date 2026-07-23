'use client'

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="no-print mt-5 rounded-sm bg-blueprint-deep px-5 py-3 font-sans font-bold text-paper">
      Gerar PDF
    </button>
  )
}
