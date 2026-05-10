#!/usr/bin/env bash
# Build dos 3 apps + consolida em dist/ raiz pra deploy num site Netlify único
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

# index.html raiz · landing simples que aponta pros 3 sistemas
cat > dist/index.html <<'HTML'
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Innova Capital</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=DM+Serif+Display&display=swap" rel="stylesheet" />
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Inter',system-ui,sans-serif;background:linear-gradient(135deg,#6364E0,#3F40A8);color:#fff;min-height:100vh;display:grid;place-items:center;padding:24px}
  .wrap{max-width:880px;text-align:center}
  h1{font-family:'DM Serif Display',serif;font-size:clamp(40px,7vw,72px);line-height:1.05;letter-spacing:-.02em;margin-bottom:24px}
  p{font-size:18px;opacity:.85;max-width:560px;margin:0 auto 48px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:24px}
  .card{background:rgba(255,255,255,.1);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.2);border-radius:24px;padding:28px 24px;text-align:left;text-decoration:none;color:#fff;transition:all .2s;display:block}
  .card:hover{background:rgba(255,255,255,.18);transform:translateY(-4px)}
  .card .tag{display:inline-block;background:#FFC600;color:#0F0F19;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;margin-bottom:16px}
  .card h2{font-family:'DM Serif Display',serif;font-size:28px;line-height:1.1;margin-bottom:8px}
  .card p{font-size:14px;opacity:.85;margin:0}
  .card .arrow{display:inline-flex;align-items:center;gap:6px;margin-top:16px;font-weight:700;font-size:13px;color:#FFC600}
  .foot{margin-top:48px;font-size:12px;opacity:.6}
</style>
</head>
<body>
<div class="wrap">
  <h1>INNOVA Capital</h1>
  <p>Plataformas de gestão de pessoas, conformidade SST e premiação. Escolha o sistema pra entrar.</p>
  <div class="grid">
    <a class="card" href="/gestor/">
      <span class="tag">Gestor</span>
      <h2>Painel master</h2>
      <p>Administra empresas, usuários e permissões.</p>
      <span class="arrow">Entrar →</span>
    </a>
    <a class="card" href="/nr1/">
      <span class="tag">NR1</span>
      <h2>Conformidade NR-1</h2>
      <p>PGR · IPAR · S-2240 · Laudo · Colaborador.</p>
      <span class="arrow">Entrar →</span>
    </a>
    <a class="card" href="/premios/">
      <span class="tag">Premiações</span>
      <h2>Art. 457 §2 CLT</h2>
      <p>Programa de premiação · atas · economia.</p>
      <span class="arrow">Entrar →</span>
    </a>
  </div>
  <p class="foot">© 2026 Innova Capital · innova.com.br</p>
</div>
</body>
</html>
HTML

# _redirects · backup das regras pra deploys manuais via API (netlify.toml é a fonte oficial)
cat > dist/_redirects <<'REDIR'
# Atalho colaborador
/c/*  /nr1/c/:splat  301!

# SPA fallbacks por subpath
/gestor/*   /gestor/index.html   200
/nr1/*      /nr1/index.html      200
/premios/*  /premios/index.html  200
REDIR

# _headers · backup pra deploys manuais
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
