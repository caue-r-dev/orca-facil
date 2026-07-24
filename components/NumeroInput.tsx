'use client'

import { useEffect, useState } from 'react'

interface NumeroInputProps {
  value: number
  onChange: (valor: number) => void
  className?: string
  name?: string
  step?: string
  min?: string
  placeholder?: string
}

// Input numérico controlado que NÃO força o valor de volta pra "0"
// enquanto a pessoa apaga/digita — com <input type="number" value={n}
// onChange={e => setN(Number(e.target.value))}> puro, apagar o campo
// vira Number('')=0 na hora, o input volta a mostrar "0" e o próximo
// dígito digitado é inserido do lado do zero em vez de substituí-lo
// (ex: "4" vira "04" ou "40"), bug que só aparecia no navegador mobile
// hospedado. Aqui o texto digitado fica livre (inclusive vazio) num
// estado próprio; só vira número de verdade pro resto do app quando dá
// pra interpretar. Sincroniza com o value externo (ex: recálculo de
// métrica do ambiente) só quando ele muda por fora, não a cada tecla.
export function NumeroInput({ value, onChange, className, name, step, min, placeholder }: NumeroInputProps) {
  const [texto, setTexto] = useState(String(value))

  useEffect(() => {
    if (Number(texto.replace(',', '.')) !== value) setTexto(String(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  function aoDigitar(e: React.ChangeEvent<HTMLInputElement>) {
    const bruto = e.target.value
    if (!/^-?\d*[.,]?\d*$/.test(bruto)) return
    setTexto(bruto)
    const normalizado = bruto.replace(',', '.')
    if (normalizado !== '' && normalizado !== '-' && !normalizado.endsWith('.')) {
      onChange(Number(normalizado))
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      name={name}
      step={step}
      min={min}
      placeholder={placeholder}
      value={texto}
      onChange={aoDigitar}
      className={className}
    />
  )
}
