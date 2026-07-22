import { useState, useMemo } from "react";
import { Zap, Droplets, Building2, LayoutGrid, Wrench, Plus, Trash2, Printer, ChevronDown } from "lucide-react";

const PALETTE = {
  paper: "#F5F2EB",
  ink: "#1E2521",
  inkSoft: "#4A534D",
  blueprint: "#2F4A5C",
  blueprintDeep: "#1F3540",
  brass: "#B4813C",
  brassSoft: "#E4C892",
  line: "#D8D2C2",
  danger: "#A3462F",
};

const SEGMENTS = {
  eletrica: {
    label: "Elétrica",
    icon: Zap,
    bdi: 25,
    itens: [
      { descricao: "Ponto de tomada", unidade: "un", valorUnit: 85, categoria: "mao_obra" },
      { descricao: "Ponto de luz", unidade: "un", valorUnit: 90, categoria: "mao_obra" },
      { descricao: "Troca de disjuntor", unidade: "un", valorUnit: 60, categoria: "mao_obra" },
      { descricao: "Fiação elétrica 2,5mm", unidade: "m", valorUnit: 6.5, categoria: "material" },
      { descricao: "Quadro de distribuição", unidade: "un", valorUnit: 320, categoria: "material" },
      { descricao: "Hora técnica eletricista", unidade: "h", valorUnit: 75, categoria: "mao_obra" },
    ],
  },
  hidraulica: {
    label: "Hidráulica",
    icon: Droplets,
    bdi: 25,
    itens: [
      { descricao: "Ponto de água", unidade: "un", valorUnit: 95, categoria: "mao_obra" },
      { descricao: "Ponto de esgoto", unidade: "un", valorUnit: 110, categoria: "mao_obra" },
      { descricao: "Troca de registro", unidade: "un", valorUnit: 70, categoria: "mao_obra" },
      { descricao: "Instalação de vaso sanitário", unidade: "un", valorUnit: 180, categoria: "mao_obra" },
      { descricao: "Tubulação PVC 25mm", unidade: "m", valorUnit: 14, categoria: "material" },
      { descricao: "Hora técnica encanador", unidade: "h", valorUnit: 75, categoria: "mao_obra" },
    ],
  },
  construcao: {
    label: "Pedreiro / Construção",
    icon: Building2,
    bdi: 22,
    itens: [
      { descricao: "Levantamento de parede", unidade: "m²", valorUnit: 65, categoria: "mao_obra" },
      { descricao: "Reboco", unidade: "m²", valorUnit: 38, categoria: "mao_obra" },
      { descricao: "Contrapiso", unidade: "m²", valorUnit: 42, categoria: "mao_obra" },
      { descricao: "Concretagem", unidade: "m³", valorUnit: 480, categoria: "material" },
      { descricao: "Hora pedreiro", unidade: "h", valorUnit: 55, categoria: "mao_obra" },
      { descricao: "Hora ajudante", unidade: "h", valorUnit: 35, categoria: "mao_obra" },
    ],
  },
  drywall: {
    label: "Drywall",
    icon: LayoutGrid,
    bdi: 24,
    itens: [
      { descricao: "Placa de drywall", unidade: "m²", valorUnit: 48, categoria: "material" },
      { descricao: "Estrutura metálica", unidade: "m²", valorUnit: 32, categoria: "material" },
      { descricao: "Isolamento acústico", unidade: "m²", valorUnit: 18, categoria: "material" },
      { descricao: "Acabamento / massa corrida", unidade: "m²", valorUnit: 22, categoria: "mao_obra" },
      { descricao: "Hora técnica drywall", unidade: "h", valorUnit: 65, categoria: "mao_obra" },
    ],
  },
  geral: {
    label: "Outro serviço",
    icon: Wrench,
    bdi: 25,
    itens: [],
  },
};

let nextId = 1;

export default function OrcaFacil() {
  const [segmentoKey, setSegmentoKey] = useState("eletrica");
  const [itens, setItens] = useState([]);
  const [bdi, setBdi] = useState(SEGMENTS.eletrica.bdi);
  const [empresa, setEmpresa] = useState("Sua Empresa / Nome Profissional");
  const [cliente, setCliente] = useState("");
  const [obraEndereco, setObraEndereco] = useState("");
  const [validadeDias, setValidadeDias] = useState(7);
  const [prazoExecucao, setPrazoExecucao] = useState("");
  const [pagamento, setPagamento] = useState("50% de entrada, 50% na entrega");
  const [showTemplates, setShowTemplates] = useState(true);

  const segmento = SEGMENTS[segmentoKey];

  function trocarSegmento(key) {
    setSegmentoKey(key);
    setBdi(SEGMENTS[key].bdi);
  }

  function adicionarDoTemplate(item) {
    setItens((prev) => [
      ...prev,
      { id: nextId++, descricao: item.descricao, unidade: item.unidade, categoria: item.categoria, quantidade: 1, valorUnit: item.valorUnit },
    ]);
  }

  function adicionarItemVazio() {
    setItens((prev) => [
      ...prev,
      { id: nextId++, descricao: "", unidade: "un", categoria: "mao_obra", quantidade: 1, valorUnit: 0 },
    ]);
  }

  function atualizarItem(id, campo, valor) {
    setItens((prev) => prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it)));
  }

  function removerItem(id) {
    setItens((prev) => prev.filter((it) => it.id !== id));
  }

  const { subtotalMaterial, subtotalMaoObra, subtotal, valorBdi, total } = useMemo(() => {
    let sm = 0, so = 0;
    for (const it of itens) {
      const v = (Number(it.quantidade) || 0) * (Number(it.valorUnit) || 0);
      if (it.categoria === "material") sm += v; else so += v;
    }
    const sub = sm + so;
    const bdiVal = sub * (Number(bdi) / 100);
    return { subtotalMaterial: sm, subtotalMaoObra: so, subtotal: sub, valorBdi: bdiVal, total: sub + bdiVal };
  }, [itens, bdi]);

  const fmt = (n) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const Icon = segmento.icon;

  return (
    <div style={{ background: PALETTE.paper, color: PALETTE.ink, minHeight: "100%", fontFamily: "'Georgia', serif" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only-area { box-shadow: none !important; border: none !important; }
        }
        .mono { font-family: 'Courier New', ui-monospace, monospace; }
        .sans { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        input, select {
          background: transparent;
          border: none;
          border-bottom: 1px solid ${PALETTE.line};
          outline: none;
          font-family: inherit;
          color: inherit;
          padding: 2px 0;
        }
        input:focus, select:focus { border-bottom: 1px solid ${PALETTE.brass}; }
        ::placeholder { color: ${PALETTE.inkSoft}; opacity: 0.6; }
      `}</style>

      {/* Header */}
      <div className="no-print sans" style={{ background: PALETTE.blueprintDeep, color: PALETTE.paper, padding: "18px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, letterSpacing: 0.3 }}>Orça Fácil</span>
            <span style={{ fontSize: 12, opacity: 0.6 }}>por Nexvix</span>
          </div>
          <span style={{ fontSize: 12, opacity: 0.75 }}>orçamentos profissionais para prestadores de serviço</span>
        </div>
      </div>

      <div className="sans" style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 20px 60px", display: "grid", gridTemplateColumns: "1.05fr 1fr", gap: 28 }}>
        {/* LEFT: builder */}
        <div className="no-print">
          {/* Segment picker */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
            {Object.entries(SEGMENTS).map(([key, seg]) => {
              const SegIcon = seg.icon;
              const active = key === segmentoKey;
              return (
                <button
                  key={key}
                  onClick={() => trocarSegmento(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 3, cursor: "pointer",
                    border: `1px solid ${active ? PALETTE.brass : PALETTE.line}`,
                    background: active ? PALETTE.brassSoft : "transparent",
                    color: PALETTE.ink, fontSize: 13, fontWeight: active ? 700 : 400,
                  }}
                >
                  <SegIcon size={15} />
                  {seg.label}
                </button>
              );
            })}
          </div>

          {/* Dados do orçamento */}
          <div style={{ marginBottom: 26, paddingBottom: 20, borderBottom: `1px solid ${PALETTE.line}` }}>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: PALETTE.brass, marginBottom: 12, fontWeight: 700 }}>
              Dados do orçamento
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                Sua empresa / nome
                <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                Cliente
                <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nome do cliente" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}>
                Endereço da obra
                <input value={obraEndereco} onChange={(e) => setObraEndereco(e.target.value)} placeholder="Rua, número, bairro" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                Prazo de execução
                <input value={prazoExecucao} onChange={(e) => setPrazoExecucao(e.target.value)} placeholder="ex: 10 dias úteis" />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                Validade da proposta (dias)
                <input type="number" value={validadeDias} onChange={(e) => setValidadeDias(e.target.value)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: "1 / -1" }}>
                Condições de pagamento
                <input value={pagamento} onChange={(e) => setPagamento(e.target.value)} />
              </label>
            </div>
          </div>

          {/* Templates rápidos */}
          {segmento.itens.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <button
                onClick={() => setShowTemplates((s) => !s)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: PALETTE.brass, fontWeight: 700, padding: 0 }}
              >
                Itens comuns de {segmento.label.toLowerCase()}
                <ChevronDown size={14} style={{ transform: showTemplates ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
              </button>
              {showTemplates && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                  {segmento.itens.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => adicionarDoTemplate(item)}
                      style={{
                        fontSize: 12.5, padding: "7px 12px", borderRadius: 3, cursor: "pointer",
                        border: `1px solid ${PALETTE.line}`, background: "#fff", color: PALETTE.ink,
                        display: "flex", alignItems: "center", gap: 5,
                      }}
                    >
                      <Plus size={12} color={PALETTE.brass} />
                      {item.descricao}
                      <span style={{ opacity: 0.5 }}>· {fmt(item.valorUnit)}/{item.unidade}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lista de itens editável */}
          <div>
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: PALETTE.brass, marginBottom: 12, fontWeight: 700 }}>
              Itens do orçamento
            </div>
            {itens.length === 0 && (
              <div style={{ fontSize: 13.5, color: PALETTE.inkSoft, marginBottom: 14, fontStyle: "italic" }}>
                Nenhum item ainda — adicione pelos atalhos acima ou crie um item manual.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
              {itens.map((it) => (
                <div key={it.id} style={{ display: "grid", gridTemplateColumns: "2.2fr 0.7fr 0.7fr 0.9fr 0.9fr auto", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input value={it.descricao} onChange={(e) => atualizarItem(it.id, "descricao", e.target.value)} placeholder="Descrição" />
                  <select value={it.categoria} onChange={(e) => atualizarItem(it.id, "categoria", e.target.value)}>
                    <option value="material">Material</option>
                    <option value="mao_obra">Mão de obra</option>
                  </select>
                  <input value={it.unidade} onChange={(e) => atualizarItem(it.id, "unidade", e.target.value)} placeholder="un" />
                  <input className="mono" type="number" value={it.quantidade} onChange={(e) => atualizarItem(it.id, "quantidade", e.target.value)} />
                  <input className="mono" type="number" value={it.valorUnit} onChange={(e) => atualizarItem(it.id, "valorUnit", e.target.value)} />
                  <button onClick={() => removerItem(it.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    <Trash2 size={15} color={PALETTE.danger} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={adicionarItemVazio}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px dashed ${PALETTE.line}`, borderRadius: 3, padding: "8px 14px", cursor: "pointer", fontSize: 13, color: PALETTE.inkSoft }}
            >
              <Plus size={14} /> Item manual
            </button>
          </div>

          {/* BDI */}
          <div style={{ marginTop: 26, paddingTop: 20, borderTop: `1px solid ${PALETTE.line}`, display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
            <span>BDI / margem sobre o total:</span>
            <input className="mono" type="number" value={bdi} onChange={(e) => setBdi(e.target.value)} style={{ width: 50, textAlign: "center" }} />
            <span>%</span>
            <span style={{ fontSize: 12, color: PALETTE.inkSoft, marginLeft: 6 }}>
              (cobre imposto, deslocamento e margem de lucro)
            </span>
          </div>

          <button
            onClick={() => window.print()}
            style={{
              marginTop: 24, display: "flex", alignItems: "center", gap: 8,
              background: PALETTE.blueprintDeep, color: PALETTE.paper, border: "none",
              padding: "12px 20px", borderRadius: 3, cursor: "pointer", fontSize: 14, fontWeight: 700,
            }}
          >
            <Printer size={16} /> Gerar proposta em PDF
          </button>
        </div>

        {/* RIGHT: live preview */}
        <div
          className="print-only-area"
          style={{
            background: "#fff",
            border: `1px solid ${PALETTE.line}`,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            padding: "36px 32px",
            position: "sticky",
            top: 20,
            alignSelf: "start",
            backgroundImage:
              "linear-gradient(#EDEAE0 1px, transparent 1px), linear-gradient(90deg, #EDEAE0 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            backgroundPosition: "-1px -1px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>{empresa || "Sua Empresa"}</div>
              <div style={{ fontSize: 12, color: PALETTE.inkSoft, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                <Icon size={13} /> {segmento.label}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11.5, color: PALETTE.inkSoft }}>
              <div>Proposta de Orçamento</div>
              <div>Válida por {validadeDias || 0} dias</div>
            </div>
          </div>

          <div style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.7 }}>
            <div><strong>Cliente:</strong> {cliente || "—"}</div>
            <div><strong>Local da obra:</strong> {obraEndereco || "—"}</div>
            {prazoExecucao && <div><strong>Prazo de execução:</strong> {prazoExecucao}</div>}
          </div>

          <div style={{ borderTop: `1.5px solid ${PALETTE.ink}`, borderBottom: `1px solid ${PALETTE.ink}`, padding: "6px 0", display: "grid", gridTemplateColumns: "2.4fr 0.6fr 0.8fr 0.8fr", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>
            <span>Descrição</span>
            <span style={{ textAlign: "center" }}>Qtd.</span>
            <span style={{ textAlign: "right" }}>Unit.</span>
            <span style={{ textAlign: "right" }}>Total</span>
          </div>

          {itens.length === 0 ? (
            <div style={{ padding: "18px 0", fontSize: 13, color: PALETTE.inkSoft, fontStyle: "italic" }}>
              Adicione itens ao orçamento para ver a proposta aqui.
            </div>
          ) : (
            <div className="mono" style={{ fontSize: 12.5 }}>
              {itens.map((it) => (
                <div key={it.id} style={{ display: "grid", gridTemplateColumns: "2.4fr 0.6fr 0.8fr 0.8fr", padding: "7px 0", borderBottom: `1px dotted ${PALETTE.line}` }}>
                  <span className="sans" style={{ fontFamily: "Georgia, serif" }}>{it.descricao || "Item sem nome"}</span>
                  <span style={{ textAlign: "center" }}>{it.quantidade}{it.unidade}</span>
                  <span style={{ textAlign: "right" }}>{fmt(Number(it.valorUnit) || 0)}</span>
                  <span style={{ textAlign: "right" }}>{fmt((Number(it.quantidade) || 0) * (Number(it.valorUnit) || 0))}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }} className="mono">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="sans">Materiais</span><span>{fmt(subtotalMaterial)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="sans">Mão de obra</span><span>{fmt(subtotalMaoObra)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="sans">BDI ({bdi || 0}%)</span><span>{fmt(valorBdi)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1.5px solid ${PALETTE.ink}`, paddingTop: 8, marginTop: 4, fontSize: 18, fontWeight: 700 }}>
              <span className="sans" style={{ fontWeight: 700 }}>Total</span><span style={{ color: PALETTE.blueprintDeep }}>{fmt(total)}</span>
            </div>
          </div>

          <div style={{ marginTop: 22, fontSize: 11.5, color: PALETTE.inkSoft, lineHeight: 1.6 }}>
            <strong className="sans">Forma de pagamento:</strong> {pagamento}
          </div>
        </div>
      </div>
    </div>
  );
}
