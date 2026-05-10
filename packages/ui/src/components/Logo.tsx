/**
 * Logo Innova — hexágono gradient roxo + 3 barras ascendentes brancas
 * representando os 3 produtos crescendo + ponto dourado.
 */
export interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 44, className }: LogoMarkProps) {
  // ID único para evitar conflito de gradient quando há vários no DOM
  const id = `innova-grad-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="44" y2="44">
          <stop offset="0" stopColor="#6364E0" />
          <stop offset="1" stopColor="#3F40A8" />
        </linearGradient>
      </defs>
      <path d="M22 2L40 12V32L22 42L4 32V12Z" fill={`url(#${id})`} />
      <rect x="13" y="22" width="3" height="9" rx="1" fill="white" />
      <rect x="20.5" y="18" width="3" height="13" rx="1" fill="white" />
      <rect x="28" y="14" width="3" height="17" rx="1" fill="white" />
      <circle cx="34" cy="13" r="2.5" fill="#FFC600" />
    </svg>
  );
}

export interface LogoProps {
  size?: number;
  variant?: 'full' | 'mark';
  product?: 'gestor' | 'nr1' | 'premiacoes' | null;
  className?: string;
}

export function Logo({ size = 34, variant = 'full', product, className }: LogoProps) {
  if (variant === 'mark') return <LogoMark size={size} className={className} />;

  const productLabel = product === 'gestor' ? '/Gestor'
    : product === 'nr1' ? '/NR1'
    : product === 'premiacoes' ? '/Premiações'
    : null;

  return (
    <div className={`flex items-center gap-2.5 ${className || ''}`}>
      <LogoMark size={size} />
      <span className="font-extrabold tracking-tight text-[15px] leading-none">
        INNOVA
        {productLabel && <span className="text-accent-600"> {productLabel}</span>}
      </span>
    </div>
  );
}
