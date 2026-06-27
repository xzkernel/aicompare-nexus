#!/usr/bin/env bash
# ModelWise — one-time VPS bootstrap (Ubuntu 22.04/24.04)
# Run ON the server after project files are in /opt/modelwise (or set APP_DIR).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/modelwise}"
DOMAIN="${DOMAIN:-}"

echo "==> ModelWise VPS setup"
echo "    App dir: $APP_DIR"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/vps-setup.sh"
  exit 1
fi

# --- Docker ---
if ! command -v docker >/dev/null 2>&1; then
  echo "==> Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "==> Docker already installed"
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose plugin missing. Reinstall Docker or install compose plugin."
  exit 1
fi

# --- App directory ---
if [[ ! -d "$APP_DIR" ]]; then
  echo "ERROR: $APP_DIR not found."
  echo "Copy the project first, e.g. from your PC:"
  echo "  scp -r ./aicompare-nexus-main root@YOUR_VPS_IP:/opt/modelwise"
  exit 1
fi

cd "$APP_DIR"

# --- Environment ---
if [[ ! -f .env ]]; then
  cp .env.example .env
  if [[ -n "$DOMAIN" ]]; then
    sed -i "s|https://modelwise.example.com|https://${DOMAIN}|g" .env
    sed -i "s|https://modelwise.example.com|http://${DOMAIN}|g" .env
    # Also set http for first boot before TLS
    grep -q "^CORS_ORIGINS=" .env && sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=http://${DOMAIN},https://${DOMAIN}|" .env
  else
    VPS_IP=$(curl -fsSL -4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=http://${VPS_IP}:8080,http://127.0.0.1:8080|" .env
    echo "==> No DOMAIN set — using http://${VPS_IP}:8080 in CORS_ORIGINS"
  fi
  echo "==> Created .env — review: nano $APP_DIR/.env"
fi

# --- Firewall (optional but recommended) ---
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp
  ufw allow 8080/tcp comment 'ModelWise HTTP (temporary — use 443 after TLS)' >/dev/null 2>&1 || true
  ufw --force enable >/dev/null 2>&1 || true
  echo "==> UFW enabled (22, 8080). Add 80/443 when you configure HTTPS."
fi

# --- Build & start ---
echo "==> Building and starting containers (first run may take several minutes)..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "==> Done. Check status:"
docker compose -f docker-compose.prod.yml ps
echo ""
curl -fsS "http://127.0.0.1:8001/health" && echo "" || echo "WARN: backend health check failed"
echo ""
VPS_IP=$(curl -fsSL -4 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo "Open in browser: http://${VPS_IP}:8080"
echo ""
echo "Next steps:"
echo "  1. Add provider keys in Settings → run a comparison"
echo "  2. Point your domain A record to this VPS"
echo "  3. Set up HTTPS (see nginx.ssl.example.conf)"
echo "  4. Publish repo to GitHub, then on VPS: git pull && docker compose -f docker-compose.prod.yml up -d --build"
