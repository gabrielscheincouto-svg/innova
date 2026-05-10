#!/usr/bin/env bash
# ============================================================
# Innova Capital · DEPLOY NOW
# ============================================================
# Script único pra publicar tudo no Netlify de uma vez.
#
# Rode na raiz do projeto:
#   bash scripts/deploy-now.sh
#
# O que ele faz:
#   1. Valida que o build local funciona (3 apps → dist/)
#   2. Inicializa git (se necessário) e commita as mudanças
#   3. Faz push pra GitHub (gabrielscheincouto-svg/innova)
#   4. Netlify detecta o push e re-builda com a nova config
# ============================================================

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║  INNOVA CAPITAL · DEPLOY NOW                           ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ----------------------------------------------------------
# 1. Verificar pré-requisitos
# ----------------------------------------------------------
echo "→ 1/4 · Verificando pré-requisitos…"

if ! command -v git &>/dev/null; then
  echo "✗ git não encontrado. Instale via: brew install git"
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "✗ node não encontrado. Instale via: brew install node"
  exit 1
fi

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "✗ Node $NODE_MAJOR detectado. Precisa ser >= 18."
  exit 1
fi

echo "  ✓ git, node $(node --version)"

# ----------------------------------------------------------
# 2. Testar build local
# ----------------------------------------------------------
echo ""
echo "→ 2/4 · Testando build local dos 3 apps…"

if ! bash scripts/build-all.sh > /tmp/innova-build.log 2>&1; then
  echo "✗ Build local falhou. Veja log: /tmp/innova-build.log"
  tail -30 /tmp/innova-build.log
  exit 1
fi

echo "  ✓ 3 apps buildados com sucesso em dist/"
echo "    - dist/gestor   ($(du -sh dist/gestor  | cut -f1))"
echo "    - dist/nr1      ($(du -sh dist/nr1     | cut -f1))"
echo "    - dist/premios  ($(du -sh dist/premios | cut -f1))"

# ----------------------------------------------------------
# 3. Inicializar git e commitar
# ----------------------------------------------------------
echo ""
echo "→ 3/4 · Preparando commit…"

if [ ! -d ".git" ]; then
  git init -b main
  echo "  ✓ git init"
fi

# Garantir que o remote aponta pro GitHub correto
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin https://github.com/gabrielscheincouto-svg/innova.git
  echo "  ✓ git remote add origin"
else
  CUR_URL=$(git remote get-url origin)
  if [[ "$CUR_URL" != *"gabrielscheincouto-svg/innova"* ]]; then
    git remote set-url origin https://github.com/gabrielscheincouto-svg/innova.git
    echo "  ✓ git remote atualizado"
  fi
fi

# Identidade git (se não configurada globalmente)
if ! git config user.email >/dev/null; then
  git config user.email "gabrielscheincouto@gmail.com"
  git config user.name "Gabriel Couto"
fi

# Adicionar e commitar tudo
git add -A
if git diff --cached --quiet; then
  echo "  ✓ nada novo pra commitar"
else
  git commit -m "feat: consolida 3 apps em 1 site Netlify com subpaths

- /gestor  · painel master
- /nr1     · NR-1 / PGR / IPAR / colaborador (token /c/*)
- /premios · programa de premiação 457 §2

Mudanças:
- vite.config.ts de cada app com base='/<app>/'
- main.tsx com BrowserRouter basename
- scripts/build-all.sh consolida em dist/ raiz com landing
- netlify.toml com SPA redirects por subpath
- package.json com script 'build' raiz"
  echo "  ✓ commit criado"
fi

# Garantir que estamos na branch main
CUR_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
if [ "$CUR_BRANCH" != "main" ]; then
  git branch -M main
  echo "  ✓ branch renomeada pra main"
fi

# ----------------------------------------------------------
# 4. Push pra GitHub
# ----------------------------------------------------------
echo ""
echo "→ 4/4 · Push pra GitHub…"
echo ""
echo "  Se aparecer pedido de login, use:"
echo "    Username: gabrielscheincouto-svg"
echo "    Password: <seu Personal Access Token do GitHub>"
echo ""
echo "  (gere em github.com/settings/tokens com escopo 'repo')"
echo ""

if git push -u origin main --force; then
  echo ""
  echo "╔════════════════════════════════════════════════════════╗"
  echo "║  ✓ DEPLOY DISPARADO COM SUCESSO                        ║"
  echo "╠════════════════════════════════════════════════════════╣"
  echo "║                                                        ║"
  echo "║  Netlify vai detectar o push e re-buildar agora.       ║"
  echo "║                                                        ║"
  echo "║  Acompanhe em:                                         ║"
  echo "║    https://app.netlify.com/projects/inovacapital       ║"
  echo "║                                                        ║"
  echo "║  Quando builds completar (~2-3 min), teste:            ║"
  echo "║    https://inovacapital.netlify.app/gestor             ║"
  echo "║    https://inovacapital.netlify.app/nr1                ║"
  echo "║    https://inovacapital.netlify.app/premios            ║"
  echo "║                                                        ║"
  echo "║  Login Gestor:                                         ║"
  echo "║    gestor@innova.com.br  /  Innova@2026                ║"
  echo "║                                                        ║"
  echo "╚════════════════════════════════════════════════════════╝"
else
  echo ""
  echo "✗ Push falhou. Veja erro acima."
  echo ""
  echo "Causas comuns:"
  echo "  1. Token expirado/inválido → gere novo em github.com/settings/tokens"
  echo "  2. Já existe histórico divergente → tente: git pull --rebase origin main"
  echo "  3. Sem permissão → confirme que tá logado como gabrielscheincouto-svg"
  exit 1
fi
