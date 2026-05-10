import { useState } from 'react';

export function Calculadora() {
  const [colab, setColab] = useState(20);
  const [valor, setValor] = useState(1500);

  const folhaAnual = colab * valor * 12;
  const inss = folhaAnual * 0.20;
  const fgts = folhaAnual * 0.08;
  const ferias = folhaAnual * (1/12) * (4/3);
  const decimo = folhaAnual * (1/12);
  const total = inss + fgts + ferias + decimo;

  const fmt = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="font-display text-4xl">Calculadora de economia</h1>
        <p className="text-sm text-ink-700 mt-1">Quanto sua empresa economiza pagando como prêmio (Art. 457 §2) ao invés de salário</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-extrabold text-base mb-4">Sua folha de prêmios</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Quantos colaboradores recebem variável?</label>
              <input type="number" className="input text-2xl font-extrabold" value={colab} onChange={(e) => setColab(Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className="label">Valor médio mensal por colaborador (R$)</label>
              <input type="number" className="input text-2xl font-extrabold" value={valor} onChange={(e) => setValor(Number(e.target.value) || 0)} />
            </div>
            <div className="bg-surface-muted rounded-2xl p-4 text-sm">
              <div className="text-[10px] uppercase tracking-wider font-bold text-ink-500">Folha de prêmios anual</div>
              <div className="text-2xl font-extrabold mt-1">{fmt(folhaAnual)}</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-accent-500 to-accent-700 text-white relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-warn/20 blur-3xl"></div>
          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-warn">Economia anual estimada</div>
            <div className="font-display text-5xl mt-2 leading-none">{fmt(total)}</div>
            <p className="text-xs text-white/70 mt-2">a cada ano · com programa formalizado</p>

            <div className="grid grid-cols-2 gap-2 mt-6">
              <Slot label="INSS patronal (~20%)" value={fmt(inss)} />
              <Slot label="FGTS (8%)" value={fmt(fgts)} />
              <Slot label="Férias proporcionais" value={fmt(ferias)} />
              <Slot label="13º proporcional" value={fmt(decimo)} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-extrabold text-base mb-3">Importante saber</h3>
        <ul className="text-sm text-ink-700 space-y-2">
          <li>· A economia só vale se o programa for <strong>formalizado conforme Art. 457 §2 CLT</strong> (regulamento + KPIs objetivos + atas)</li>
          <li>· Prêmios habituais sem critério objetivo são descaracterizados em fiscalização e os encargos voltam com correção</li>
          <li>· O valor estimado é <em>indicativo</em> e pode variar conforme regime tributário, base de cálculo e situação específica</li>
          <li>· Sempre consulte seu contador antes de fazer mudanças na folha</li>
        </ul>
      </div>
    </div>
  );
}

function Slot({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-wider font-bold text-white/70">{label}</div>
      <div className="text-base font-extrabold mt-1">{value}</div>
    </div>
  );
}
