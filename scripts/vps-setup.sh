#!/usr/bin/env bash
# ModelWise one-time VPS bootstrap (Ubuntu 22.04/24.04).
# Run on a server where the project and Docker Engine are already installed.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/modelwise}"
DOMAIN="${DOMAIN:-}"

echo "==> ModelWise VPS setup"
echo "    App dir: $APP_DIR"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/vps-setup.sh"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker Engine is required. Install it from https://docs.docker.com/engine/install/ubuntu/."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose plugin missing. Reinstall Docker or install compose plugin."
  exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
  echo "ERROR: $APP_DIR not found."
  exit 1
fi

cd "$APP_DIR"

if [[ -z "$DOMAIN" ]]; then
  echo "ERROR: Set DOMAIN to the public hostname served by your external TLS terminator."
  exit 1
fi

if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
  echo "ERROR: DOMAIN must be a hostname without a scheme, port, or path."
  exit 1
fi

if [[ ! -f .env ]]; then
  if [[ ! -f .env.example ]]; then
    echo "ERROR: .env.example not found."
    exit 1
  fi
  cp .env.example .env
  if grep -q "^CORS_ORIGINS=" .env; then
    sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=https://${DOMAIN}|" .env
  else
    printf '\nCORS_ORIGINS=https://%s\n' "$DOMAIN" >> .env
  fi
  echo "==> Created .env with an HTTPS-only public origin."
fi

if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp
  ufw allow 80/tcp comment 'TLS certificate redirect/challenge' >/dev/null 2>&1 || true
  ufw allow 443/tcp comment 'ModelWise HTTPS' >/dev/null 2>&1 || true
  ufw --force enable >/dev/null 2>&1 || true
  echo "==> UFW enabled for SSH, HTTP certificate handling, and HTTPS."
fi

echo "==> Building and starting containers (first run may take several minutes)..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "==> Done. Check status:"
docker compose -f docker-compose.prod.yml ps
echo ""
curl -fsS "http://127.0.0.1:${FRONTEND_PORT:-8080}/health" >/dev/null \
  && echo "Frontend proxy health check passed." \
  || echo "WARN: frontend proxy health check failed"
echo ""
echo "The app listens only on 127.0.0.1:${FRONTEND_PORT:-8080}."
echo "Configure and verify an external TLS terminator before opening https://${DOMAIN}."
