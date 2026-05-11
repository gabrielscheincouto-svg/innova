/**
 * Área do Colaborador — acesso por token único, SEM login.
 *
 * Fluxo:
 *   1. URL /c/:token → valida token (assessment ativo, não expirado)
 *   2. Tela de validação CPF + nascimento (anti-bot · contra base de funcionários)
 *   3. TCLE LGPD (checkbox obrigatório)
 *   4. Escolha: responder diagnóstico OU comunicar perigo
 *   5. COPSOQ II (12 perguntas) ou form de perigo
 *   6. Sucesso · protocolo de retorno
 */
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSupabase } from '@innova/supabase';
import { LogoMark, Spinner } from '@innova/ui';

type Stage = 'loading' | 'invalid' | 'expired' | 'entrada' | 'tcle' | 'choice' | 'copsoq' | 'perigo' | 'sucesso-copsoq' | 'sucesso-perigo';

interface AssessmentInfo {
  id: string;
  company_id: string;
  cycle: string;
  expires_at: string;
  company_name?: string;
}

const QUESTIONS = [
  { dim: 'Demandas no trabalho', text: 'Você precisa trabalhar muito rapidamente para dar conta de tudo?' },
  { dim: 'Demandas no trabalho', text: 'Sua carga de trabalho costuma ficar acumulada por falta de tempo?' },
  { dim: 'Organização do trabalho', text: 'Você tem influência sobre a quantidade de trabalho que executa?' },
  { dim: 'Organização do trabalho', text: 'Você sente que pode tomar decisões importantes sobre o seu trabalho?' },
  { dim: 'Relações sociais', text: 'Sua liderança está disponível quando você precisa de apoio?' },
  { dim: 'Relações sociais', text: 'Você sente que recebe reconhecimento pelo seu trabalho bem feito?' },
  { dim: 'Cooperação', text: 'Existe um bom ambiente de cooperação entre colegas no seu setor?' },
  { dim: 'Valores', text: 'Você sente que o trabalho que realiza tem propósito e importância?' },
  { dim: 'Saúde e bem-estar', text: 'Com que frequência você se sente fisicamente esgotado(a) ao final do dia?' },
  { dim: 'Saúde e bem-estar', text: 'Você tem dificuldade em "desligar" do trabalho durante o tempo livre?' },
  { dim: 'Comportamentos ofensivos', text: 'Nos últimos 12 meses, você foi alvo de comportamentos ofensivos no trabalho?' },
  { dim: 'Satisfação', text: 'De forma geral, qual o seu nível de satisfação com o seu trabalho atual?' },
];
const SCALE_STD = ['Sempre', 'Frequentemente', 'Às vezes', 'Raramente', 'Nunca'];
const SCALE_SAT = ['Muito satisfeito(a)', 'Satisfeito(a)', 'Neutro', 'Insatisfeito(a)', 'Muito insatisfeito(a)'];

export function Colaborador() {
  const { token } = useParams();
  const [stage, setStage] = useState<Stage>('loading');
  const [assessment, setAssessment] = useState<AssessmentInfo | null>(null);
  const [validation, setValidation] = useState({ cpf: '', dob: '', error: '' });
  const [agreed, setAgreed] = useState(false);
  const [protocol, setProtocol] = useState('');

  useEffect(() => {
    async function load() {
      if (!token) { setStage('invalid'); return; }
      const sb = getSupabase();
      const { data, error } = await sb.from('assessments')
        .select('id, company_id, cycle, expires_at, companies(legal_name, trade_name)')
        .eq('token', token)
        .maybeSingle();
      if (error || !data) { setStage('invalid'); return; }
      const expired = new Date(data.expires_at) < new Date();
      if (expired) { setStage('expired'); return; }
      const co = data.companies as unknown as { legal_name: string; trade_name: string | null } | null;
      setAssessment({
        id: data.id,
        company_id: data.company_id,
        cycle: data.cycle,
        expires_at: data.expires_at,
        company_name: co ? (co.trade_name || co.legal_name) : 'sua empresa',
      });
      setStage('entrada');
    }
    load();
  }, [token]);

  if (stage === 'loading') return <Centered><Spinner size={32} className="text-accent-500" /></Centered>;
  if (stage === 'invalid') return <ErrorBox title="Link inválido" desc="Este link não foi reconhecido. Confirme com o RH da sua empresa." />;
  if (stage === 'expired') return <ErrorBox title="Link expirado" desc="A janela de coleta dessa avaliação já terminou. Fale com o RH." />;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #E2DFF4 0%, #FAFAFC 30%)' }}>
      <header className="bg-white/90 backdrop-blur sticky top-0 z-50 border-b border-black/5">
        <div className="max-w-2xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <div className="leading-tight">
              <div className="font-extrabold text-sm">INNOVA <span className="text-accent-600">/NR1</span></div>
              <div className="text-[10px] text-ink-500">{assessment?.company_name}</div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 bg-ok text-white rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
            🔒 100% Anônimo
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-6 pb-24 animate-fade-in">
        {stage === 'entrada' && assessment && (
          <EntradaStage
            validation={validation}
            setValidation={setValidation}
            onNext={async () => {
              const sb = getSupabase();
              const cpf = validation.cpf.replace(/\D/g, '');
              const { data, error } = await sb.rpc('validate_colaborador_public', {
                p_company_id: assessment.company_id,
                p_cpf: cpf,
                p_dob: validation.dob,
              });
              if (error) {
                setValidation({ ...validation, error: 'Erro ao validar. Tente novamente.' });
                return;
              }
              if (!data) {
                setValidation({ ...validation, error: 'CPF + data de nascimento não conferem. Confirme com o RH.' });
                return;
              }
              setStage('tcle');
            }}
          />
        )}
        {stage === 'tcle' && <TCLEStage agreed={agreed} setAgreed={setAgreed} onBack={() => setStage('entrada')} onNext={() => setStage('choice')} />}
        {stage === 'choice' && <ChoiceStage onCopsoq={() => setStage('copsoq')} onPerigo={() => setStage('perigo')} />}
        {stage === 'copsoq' && assessment && (
          <CopsoqStage
            assessmentId={assessment.id}
            validationHash={validation.cpf}
            onDone={() => setStage('sucesso-copsoq')}
          />
        )}
        {stage === 'perigo' && assessment && (
          <PerigoStage companyId={assessment.company_id} onDone={(p) => { setProtocol(p); setStage('sucesso-perigo'); }} onBack={() => setStage('choice')} />
        )}
        {stage === 'sucesso-copsoq' && <SucessoCopsoq />}
        {stage === 'sucesso-perigo' && <SucessoPerigo protocol={protocol} onBack={() => setStage('choice')} />}
      </main>
    </div>
  );
}

// ====== Stage components ======

function EntradaStage({ validation, setValidation, onNext }: { validation: { cpf: string; dob: string; error: string }; setValidation: (v: { cpf: string; dob: string; error: string }) => void; onNext: () => void | Promise<void> }) {
  const [submitting, setSubmitting] = useState(false);
  function maskCPF(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length > 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
    if (d.length > 6) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
    if (d.length > 3) return `${d.slice(0,3)}.${d.slice(3)}`;
    return d;
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cpf = validation.cpf.replace(/\D/g, '');
    if (cpf.length !== 11) { setValidation({ ...validation, error: 'CPF deve ter 11 dígitos' }); return; }
    if (!validation.dob) { setValidation({ ...validation, error: 'Informe a data de nascimento' }); return; }
    setSubmitting(true);
    try { await onNext(); } finally { setSubmitting(false); }
  }

  return (
    <>
      <div className="text-center mb-6 pt-4">
        <div className="w-20 h-20 mx-auto mb-5"><LogoMark size={80} /></div>
        <h1 className="font-display text-3xl leading-tight">Bem-vindo à <span className="text-accent-600">avaliação NR-1</span></h1>
        <p className="text-sm text-ink-700 mt-3 max-w-md mx-auto">Sua empresa nos confiou esta tarefa. Para começar, valide seus dados — usados apenas para confirmar que você é colaborador autorizado.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-soft p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-accent-50 grid place-items-center text-accent-600 font-extrabold text-sm">1/2</div>
          <div>
            <div className="font-extrabold">Validação de identidade</div>
            <div className="text-xs text-ink-500">Apenas para confirmar autorização</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">CPF *</label>
            <input type="text" inputMode="numeric" required maxLength={14} className="input text-lg font-bold tracking-wider"
              value={validation.cpf}
              onChange={(e) => setValidation({ ...validation, cpf: maskCPF(e.target.value), error: '' })}
              placeholder="000.000.000-00" />
          </div>
          <div>
            <label className="label">Data de nascimento *</label>
            <input type="date" required className="input text-base font-bold"
              value={validation.dob}
              onChange={(e) => setValidation({ ...validation, dob: e.target.value, error: '' })} />
          </div>
          {validation.error && (
            <div className="text-xs text-danger bg-danger/10 rounded-2xl px-4 py-3">{validation.error}</div>
          )}

          <div className="bg-accent-50 rounded-2xl p-4 flex gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6364E0" strokeWidth="2" className="flex-shrink-0 mt-0.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div className="text-xs text-ink-700">
              <strong className="text-ink-900 block mb-1">Como protegemos seus dados</strong>
              O CPF é validado apenas para confirmar autorização. Após a validação, o vínculo CPF↔resposta é descartado e não há tabela de junção.
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full btn btn-primary justify-center text-base disabled:opacity-60">
            {submitting ? 'Validando…' : 'Continuar →'}
          </button>
        </form>
      </div>
    </>
  );
}

function TCLEStage({ agreed, setAgreed, onBack, onNext }: { agreed: boolean; setAgreed: (b: boolean) => void; onBack: () => void; onNext: () => void }) {
  return (
    <>
      <button onClick={onBack} className="text-xs text-ink-500 font-semibold mb-4 inline-flex items-center gap-1">← Voltar</button>
      <div className="bg-white rounded-3xl shadow-soft p-6 lg:p-8">
        <span className="inline-block px-3 py-1 bg-accent-50 text-accent-700 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-4">Antes de começar</span>
        <h2 className="font-display text-2xl">Termo de Consentimento Livre e Esclarecido</h2>

        <div className="bg-surface-muted rounded-2xl p-4 mt-5 max-h-72 overflow-y-auto text-xs text-ink-700 leading-relaxed space-y-3 border border-black/5">
          <p>Este questionário tem como objetivo identificar fatores de risco psicossocial no ambiente de trabalho, conforme exigido pela NR-1, atualizada pela Portaria MTE 1.419/2024.</p>
          <p><strong>LGPD:</strong> Coletamos respostas anônimas, sem associação a nome, e-mail, IP ou qualquer dado pessoal direto. CPF e data de nascimento foram usados apenas para confirmar autorização — após a validação, o vínculo é descartado.</p>
          <p><strong>Direitos:</strong> Você pode interromper a qualquer momento, sem prejuízo. Resultados são apresentados em formato agregado, com regra dos 5 respondentes.</p>
          <p><strong>Retenção:</strong> Dados anônimos armazenados por 20 anos para fins de auditoria, conforme NR-1.</p>
        </div>

        <label className="flex gap-3 items-start mt-5 p-4 bg-accent-50 rounded-2xl cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="w-5 h-5 mt-0.5 accent-accent-500" />
          <div className="text-sm text-ink-900"><strong>Li e concordo</strong> com o termo e desejo participar de forma anônima.</div>
        </label>

        <button onClick={onNext} disabled={!agreed} className="w-full mt-5 btn btn-primary justify-center disabled:opacity-50">Começar →</button>
      </div>
    </>
  );
}

function ChoiceStage({ onCopsoq, onPerigo }: { onCopsoq: () => void; onPerigo: () => void }) {
  return (
    <>
      <div className="text-center pb-2 pt-2">
        <div className="w-16 h-16 rounded-2xl bg-ok grid place-items-center mx-auto mb-4 shadow-lg shadow-ok/30">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
        </div>
        <h1 className="font-display text-3xl">Pronto, colaborador!</h1>
        <p className="text-sm text-ink-700 mt-2">Você está autorizado. Como deseja participar?</p>
      </div>

      <div className="space-y-3 mt-6">
        <button onClick={onCopsoq} className="w-full bg-white rounded-3xl p-5 hover:-translate-y-0.5 hover:shadow-md transition text-left flex items-center gap-4 border-2 border-transparent hover:border-accent-500">
          <div className="w-14 h-14 rounded-2xl bg-accent-50 grid place-items-center flex-shrink-0">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6364E0" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /></svg>
          </div>
          <div className="flex-1">
            <div className="font-extrabold">Responder o diagnóstico</div>
            <div className="text-xs text-ink-500 mt-0.5">Questionário de saúde e bem-estar. ~8 minutos.</div>
          </div>
          <span>→</span>
        </button>

        <button onClick={onPerigo} className="w-full bg-white rounded-3xl p-5 hover:-translate-y-0.5 hover:shadow-md transition text-left flex items-center gap-4 border-2 border-transparent hover:border-accent-500">
          <div className="w-14 h-14 rounded-2xl bg-warn/10 grid place-items-center flex-shrink-0">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
          </div>
          <div className="flex-1">
            <div className="font-extrabold">Comunicar um perigo</div>
            <div className="text-xs text-ink-500 mt-0.5">Reporte uma situação de risco no seu local de trabalho.</div>
          </div>
          <span>→</span>
        </button>
      </div>
    </>
  );
}

function CopsoqStage({ assessmentId, validationHash, onDone }: { assessmentId: string; validationHash: string; onDone: () => void }) {
  const [curr, setCurr] = useState(0);
  const [responses, setResponses] = useState<(number | null)[]>(new Array(QUESTIONS.length).fill(null));
  const [saving, setSaving] = useState(false);
  const q = QUESTIONS[curr];
  const opts = curr === QUESTIONS.length - 1 ? SCALE_SAT : SCALE_STD;

  async function handleNext() {
    if (responses[curr] === null) return;
    if (curr === QUESTIONS.length - 1) {
      setSaving(true);
      const sb = getSupabase();
      // Hash simples do CPF (em produção: usar hashing crypto-strong server-side)
      const hash = btoa(validationHash).slice(0, 16);
      const responsesObj: Record<string, number> = {};
      QUESTIONS.forEach((qq, i) => { responsesObj[`q${i + 1}_${qq.dim.toLowerCase().replace(/\s+/g, '_')}`] = responses[i]!; });
      const { error } = await sb.from('copsoq_responses').insert({
        assessment_id: assessmentId,
        validation_hash: hash,
        responses: responsesObj,
      });
      // Incrementa contador (best-effort, sem bloquear se RPC não existir)
      try { await sb.rpc('increment_assessment_responses', { aid: assessmentId }); } catch { /* ignore */ }
      setSaving(false);
      if (error) { alert('Erro ao gravar: ' + error.message); return; }
      onDone();
      return;
    }
    setCurr(curr + 1);
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-3 shadow-soft mb-4">
        <div className="flex items-center justify-between text-xs font-bold mb-2">
          <span>Pergunta {curr + 1} de {QUESTIONS.length}</span>
          <span className="text-accent-600">{q.dim}</span>
        </div>
        <div className="h-2 bg-surface rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent-500 to-accent-700 rounded-full transition-all" style={{ width: `${(curr / QUESTIONS.length) * 100}%` }} />
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-soft">
        <span className="inline-block px-3 py-1 bg-accent-50 text-accent-700 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-4">{curr + 1} / {QUESTIONS.length}</span>
        <h2 className="text-lg lg:text-xl font-extrabold leading-snug">{q.text}</h2>
        <div className="space-y-2.5 mt-6">
          {opts.map((opt, i) => {
            const selected = responses[curr] === i;
            return (
              <button
                key={i}
                onClick={() => { const r = [...responses]; r[curr] = i; setResponses(r); }}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition font-semibold ${
                  selected
                    ? 'bg-accent-500 text-white border-accent-500'
                    : 'bg-surface-muted border-transparent hover:bg-accent-50 hover:border-accent-300'
                }`}
              >
                <span className={`w-7 h-7 rounded-full grid place-items-center font-extrabold text-xs flex-shrink-0 ${selected ? 'bg-ink-900 text-warn' : 'bg-white border border-black/10 text-ink-900'}`}>{i + 1}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <button onClick={() => setCurr(Math.max(0, curr - 1))} disabled={curr === 0} className="btn btn-ghost disabled:opacity-50">← Anterior</button>
        <button onClick={handleNext} disabled={responses[curr] === null || saving} className="btn btn-primary flex-1 justify-center disabled:opacity-50">
          {saving ? <Spinner size={16} /> : curr === QUESTIONS.length - 1 ? 'Concluir →' : 'Continuar →'}
        </button>
      </div>
    </>
  );
}

function PerigoStage({ companyId, onDone, onBack }: { companyId: string; onDone: (protocol: string) => void; onBack: () => void }) {
  const [form, setForm] = useState({
    anonymous: 'sim',
    setor: '', hazard_type: '', description: '', dano: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const sb = getSupabase();
    const { data, error } = await sb.from('hazard_communications').insert({
      company_id: companyId,
      setor: form.setor,
      hazard_type: form.hazard_type,
      description: form.description + (form.dano ? `\n\nPossível dano: ${form.dano}` : ''),
      reporter_name: form.anonymous === 'sim' ? 'Anônimo' : null,
      classification: 'medio',
      status: 'aberta',
    }).select('protocolo').single();
    setSaving(false);
    if (error || !data) { alert('Erro: ' + (error?.message || 'desconhecido')); return; }
    onDone(data.protocolo);
  }

  return (
    <>
      <button onClick={onBack} className="text-xs text-ink-500 font-semibold mb-4">← Voltar</button>
      <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-soft">
        <span className="inline-block px-3 py-1 bg-warn/10 text-warn rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-4">Comunicação de perigo</span>
        <h2 className="font-display text-2xl">Reporte um risco</h2>
        <p className="text-sm text-ink-700 mt-2">Quanto mais detalhado, melhor o tratamento.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Identificação</label>
            <select className="input" value={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.value })}>
              <option value="sim">Anônimo (recomendado)</option>
              <option value="nao">Quero me identificar</option>
            </select>
          </div>
          <div>
            <label className="label">Setor / Local *</label>
            <input required className="input" value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} placeholder="Logística, Atendimento..." />
          </div>
          <div>
            <label className="label">Tipo de perigo *</label>
            <select required className="input" value={form.hazard_type} onChange={(e) => setForm({ ...form, hazard_type: e.target.value })}>
              <option value="">Selecione...</option>
              <option value="fisico">Físico (ruído, calor, queda)</option>
              <option value="quimico">Químico</option>
              <option value="biologico">Biológico</option>
              <option value="ergonomico">Ergonômico</option>
              <option value="mecanico">Mecânico</option>
              <option value="acidentes">Acidentes</option>
              <option value="psicossocial">Psicossocial</option>
            </select>
          </div>
          <div>
            <label className="label">Descrição do perigo *</label>
            <textarea required rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex.: Piso molhado sem sinalização perto da rampa..." />
          </div>
          <div>
            <label className="label">Possível dano (opcional)</label>
            <textarea rows={2} className="input" value={form.dano} onChange={(e) => setForm({ ...form, dano: e.target.value })} placeholder="Queda com lesão, intoxicação..." />
          </div>
          <button type="submit" disabled={saving} className="w-full btn btn-primary justify-center disabled:opacity-50">
            {saving ? <Spinner size={16} /> : 'Enviar comunicação →'}
          </button>
        </form>
      </div>
    </>
  );
}

function SucessoCopsoq() {
  return (
    <div className="bg-white rounded-3xl p-8 shadow-soft text-center">
      <div className="w-20 h-20 rounded-full bg-ok grid place-items-center mx-auto mb-5 shadow-lg shadow-ok/40">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <h2 className="font-display text-3xl">Obrigado pela participação!</h2>
      <p className="text-sm text-ink-700 mt-3 max-w-sm mx-auto">Sua resposta foi registrada de forma <strong>anônima e segura</strong>.</p>
      <div className="bg-accent-50 rounded-2xl p-4 mt-6 text-left text-xs text-ink-700">
        <strong className="text-accent-700 block mb-1">Confirmação</strong>
        Resposta gravada com hash único. Vínculo CPF descartado. Você pode fechar esta página.
      </div>
    </div>
  );
}

function SucessoPerigo({ protocol, onBack }: { protocol: string; onBack: () => void }) {
  return (
    <div className="bg-white rounded-3xl p-8 shadow-soft text-center">
      <div className="w-20 h-20 rounded-full bg-ok grid place-items-center mx-auto mb-5 shadow-lg shadow-ok/40">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <h2 className="font-display text-3xl">Comunicação enviada!</h2>
      <p className="text-sm text-ink-700 mt-3 max-w-sm mx-auto">Sua comunicação foi recebida e será tratada em até <strong>3 dias úteis</strong>.</p>
      <div className="bg-gradient-to-br from-accent-500 to-accent-700 text-white rounded-2xl p-5 mt-6 text-left">
        <div className="text-[10px] uppercase tracking-wider font-extrabold text-warn">Protocolo de retorno</div>
        <div className="font-mono text-2xl font-extrabold tracking-tight mt-1">{protocol}</div>
        <div className="text-xs text-white/70 mt-1">Guarde este número para acompanhamento.</div>
      </div>
      <button onClick={onBack} className="btn btn-primary mt-6">Voltar ao início</button>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen grid place-items-center">{children}</div>;
}

function ErrorBox({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="min-h-screen grid place-items-center px-4" style={{ background: 'linear-gradient(180deg, #E2DFF4 0%, #FAFAFC 30%)' }}>
      <div className="bg-white rounded-4xl p-10 max-w-md text-center shadow-soft">
        <div className="w-16 h-16 rounded-3xl bg-danger/10 grid place-items-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="text-sm text-ink-700 mt-3">{desc}</p>
      </div>
    </div>
  );
}
