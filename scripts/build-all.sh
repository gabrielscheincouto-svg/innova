#!/usr/bin/env bash
# Build dos 3 apps + landings institucionais + página de sistemas (cards) consolidado em dist/
set -e

echo "=== Innova · Build All ==="
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Instalando deps (npm workspaces)"
npm install --no-audit --no-fund

echo "→ Building @innova/gestor"
npm run build:gestor

echo "→ Building @innova/nr1"
npm run build:nr1

echo "→ Building @innova/premiacoes"
npm run build:premiacoes

echo "→ Consolidando em dist/"
rm -rf dist
mkdir -p dist
cp -R apps/gestor/dist dist/gestor
cp -R apps/nr1/dist dist/nr1
cp -R apps/premiacoes/dist dist/premios

# ----------------------------------------------------------
# Landings institucionais (vindas de landing/)
# ----------------------------------------------------------
echo "→ Copiando landings institucionais"

# Helper · reescreve links das landings pra paths corretos
rewrite_links() {
  local src="$1"
  local dst="$2"
  sed -e 's|href="innova\.html"|href="/"|g' \
      -e 's|href="innova-nr1\.html"|href="/innova-nr1.html"|g' \
      -e 's|href="innova-premiacoes\.html"|href="/innova-premiacoes.html"|g' \
      -e 's|href="innova-rh\.html"|href="/innova-rh.html"|g' \
      -e 's|href="profissional\.html"|href="/sistemas"|g' \
      -e 's|href="colaborador\.html"|href="/sistemas"|g' \
      "$src" > "$dst"
}

rewrite_links landing/innova.html              dist/index.html
rewrite_links landing/innova-nr1.html          dist/innova-nr1.html
rewrite_links landing/innova-premiacoes.html   dist/innova-premiacoes.html
rewrite_links landing/innova-rh.html           dist/innova-rh.html

# ----------------------------------------------------------
# /sistemas · página de cards (acesso aos 3 apps)
# ----------------------------------------------------------
echo "→ Gerando /sistemas (cards de acesso)"
mkdir -p dist/sistemas
cat > dist/sistemas/index.html <<'HTML'
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Acesso aos sistemas · Innova Capital</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=DM+Serif+Display&display=swap" rel="stylesheet" />
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',system-ui,sans-serif;background:linear-gradient(135deg,#6364E0,#3F40A8);color:#fff;min-height:100vh;display:grid;place-items:center;padding:24px}
  .wrap{max-width:980px;width:100%;text-align:center}
  .back{display:inline-flex;align-items:center;gap:8px;color:#fff;opacity:.7;text-decoration:none;font-size:13px;font-weight:600;margin-bottom:32px;transition:opacity .2s}
  .back:hover{opacity:1}
  .badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.2);border-radius:9999px;padding:6px 14px;font-size:11px;font-weight:800;letter-spacing:.15em;text-transform:uppercase;margin-bottom:24px}
  .badge .dot{width:6px;height:6px;border-radius:9999px;background:#FFC600;animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  h1{font-family:'DM Serif Display',serif;font-size:clamp(40px,6vw,64px);line-height:1.05;letter-spacing:-.02em;margin-bottom:18px}
  .lead{font-size:17px;opacity:.85;max-width:560px;margin:0 auto 48px;line-height:1.55}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:32px;text-align:left}
  .card{position:relative;background:rgba(255,255,255,.08);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.18);border-radius:24px;padding:32px 28px;text-decoration:none;color:#fff;transition:all .3s cubic-bezier(.34,1.56,.64,1);overflow:hidden}
  .card:hover{background:rgba(255,255,255,.16);transform:translateY(-6px);border-color:rgba(255,198,0,.4)}
  .card::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at top right,rgba(255,198,0,.15),transparent 50%);opacity:0;transition:opacity .3s}
  .card:hover::before{opacity:1}
  .card .tag{display:inline-block;background:#FFC600;color:#0F0F19;padding:5px 12px;border-radius:9999px;font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:18px}
  .card h2{font-family:'DM Serif Display',serif;font-size:30px;line-height:1.1;margin-bottom:10px;letter-spacing:-.01em}
  .card .desc{font-size:14px;opacity:.8;line-height:1.5}
  .card .arrow{display:inline-flex;align-items:center;gap:8px;margin-top:24px;font-weight:800;font-size:13px;color:#FFC600;text-transform:uppercase;letter-spacing:.08em;transition:gap .3s}
  .card:hover .arrow{gap:14px}
  .foot{margin-top:64px;font-size:12px;opacity:.55;line-height:1.6}
  .foot a{color:#FFC600;text-decoration:none}
</style>
</head>
<body>
<div class="wrap">
  <a href="/" class="back">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="15 18 9 12 15 6"/></svg>
    Voltar pra Innova
  </a>
  <span class="badge"><span class="dot"></span>Área restrita · acesso autorizado</span>
  <h1>Bem-vindo de volta</h1>
  <p class="lead">Escolha o sistema pra entrar. Use seu email Innova e senha.</p>

  <div class="grid">
    <a class="card" href="/gestor/">
      <span class="tag">Gestor</span>
      <h2>Painel master</h2>
      <p class="desc">Administra empresas, usuários e libera quais sistemas cada cliente acessa.</p>
      <span class="arrow">Entrar
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </span>
    </a>
    <a class="card" href="/nr1/">
      <span class="tag">NR1</span>
      <h2>Conformidade NR-1</h2>
      <p class="desc">PGR · IPAR · S-2240 · Laudo · Comunicação de perigo · Área do colaborador.</p>
      <span class="arrow">Entrar
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </span>
    </a>
    <a class="card" href="/premios/">
      <span class="tag">Premiações</span>
      <h2>Art. 457 §2 CLT</h2>
      <p class="desc">Colaboradores · critérios · avaliação mensal · folha · contratos · calculadora.</p>
      <span class="arrow">Entrar
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </span>
    </a>
  </div>

  <p class="foot">© 2026 Innova Capital · <a href="/">innova.com.br</a></p>
</div>
</body>
</html>
HTML

# ----------------------------------------------------------
# _redirects · regras de roteamento Netlify
# ----------------------------------------------------------
echo "→ Gerando _redirects"
cat > dist/_redirects <<'REDIR'
# Atalho colaborador
/c/*  /nr1/c/:splat  301!

# SPA fallbacks por subpath (apps React)
/gestor/*   /gestor/index.html   200
/nr1/*      /nr1/index.html      200
/premios/*  /premios/index.html  200
REDIR

# ----------------------------------------------------------
# _headers · segurança + cache
# ----------------------------------------------------------
echo "→ Gerando _headers"
cat > dist/_headers <<'HDR'
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload

/gestor/assets/*
  Cache-Control: public, max-age=31536000, immutable

/nr1/assets/*
  Cache-Control: public, max-age=31536000, immutable

/premios/assets/*
  Cache-Control: public, max-age=31536000, immutable
HDR

echo "=== Build All concluído ==="
ls -la dist/
