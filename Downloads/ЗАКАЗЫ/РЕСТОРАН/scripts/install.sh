#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Скрипт установки Restaurant Warehouse Bot на Ubuntu VPS
# Использование: bash install.sh
# ─────────────────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
prompt()  { read -rp "$(echo -e "${YELLOW}>>> $1: ${NC}")" "$2"; }
promptp() { read -rsp "$(echo -e "${YELLOW}>>> $1: ${NC}")" "$2"; echo; }

echo ""
echo "======================================================"
echo "  Restaurant Warehouse Bot — Установщик"
echo "======================================================"
echo ""

# ── Сбор переменных ──────────────────────────────────────────────────────────
prompt "BOT_TOKEN (от @BotFather)" BOT_TOKEN
prompt "ADMIN_CHAT_ID (ID Telegram-группы, напр. -100123456789)" ADMIN_CHAT_ID
prompt "SUPABASE_URL (https://xxx.supabase.co)" SUPABASE_URL
prompt "SUPABASE_KEY (anon/service key)" SUPABASE_KEY
prompt "REDIS_URL (redis://localhost:6379)" REDIS_URL
REDIS_URL=${REDIS_URL:-redis://localhost:6379}
prompt "Домен для Nginx (напр. bot.example.com)" DOMAIN
prompt "Логин для веб-adminки" ADMIN_LOGIN
promptp "Пароль для веб-adminки" ADMIN_PASS
promptp "Пароль для входа в бота (сотрудники)" BOT_PASS
prompt "Git репозиторий (https://github.com/...)" GIT_REPO
INSTALL_DIR=${INSTALL_DIR:-/var/www/restaurant-bot}

SESSION_SECRET=$(openssl rand -hex 32)

echo ""
info "Начинаю установку..."

# ── Система ──────────────────────────────────────────────────────────────────
info "Обновляю пакеты..."
apt-get update -qq

info "Устанавливаю зависимости..."
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx redis-server

# ── Node.js 20 ───────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]]; then
  info "Устанавливаю Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
info "Node.js: $(node -v), npm: $(npm -v)"

# ── PM2 ──────────────────────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  info "Устанавливаю PM2..."
  npm install -g pm2
  pm2 startup systemd -u root --hp /root | tail -1 | bash
fi

# ── Клонирование проекта ──────────────────────────────────────────────────────
if [[ -d "$INSTALL_DIR" ]]; then
  warn "Директория $INSTALL_DIR уже существует. Обновляю..."
  cd "$INSTALL_DIR" && git pull
else
  info "Клонирую репозиторий..."
  git clone "$GIT_REPO" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ── .env ──────────────────────────────────────────────────────────────────────
info "Создаю .env..."
cat > .env <<EOF
BOT_TOKEN=${BOT_TOKEN}
ADMIN_CHAT_ID=${ADMIN_CHAT_ID}
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_KEY=${SUPABASE_KEY}
REDIS_URL=${REDIS_URL}
SESSION_SECRET=${SESSION_SECRET}
PORT=3000
NODE_ENV=production
EOF

# ── Зависимости ───────────────────────────────────────────────────────────────
info "Устанавливаю npm-зависимости..."
npm ci --only=production

# ── Создание admin-пользователя и пароля бота ────────────────────────────────
info "Инициализирую пользователя adminки и пароль бота в БД..."

node - <<JSEOF
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function init() {
  const adminHash = await bcrypt.hash('${ADMIN_PASS}', 10);
  const botHash   = await bcrypt.hash('${BOT_PASS}', 10);

  const { error: e1 } = await supabase
    .from('admin_users')
    .upsert({ username: '${ADMIN_LOGIN}', password_hash: adminHash }, { onConflict: 'username' });
  if (e1) throw new Error('admin_users: ' + e1.message);

  const { error: e2 } = await supabase
    .from('bot_settings')
    .upsert({ key: 'bot_password', value: botHash });
  if (e2) throw new Error('bot_settings: ' + e2.message);

  console.log('DB initialized OK');
}

init().catch(err => { console.error(err.message); process.exit(1); });
JSEOF

# ── Redis ─────────────────────────────────────────────────────────────────────
info "Запускаю Redis..."
systemctl enable redis-server
systemctl restart redis-server

# ── PM2 ──────────────────────────────────────────────────────────────────────
mkdir -p /var/log/pm2
info "Запускаю приложение через PM2..."
pm2 start ecosystem.config.js --env production
pm2 save

# ── Nginx ─────────────────────────────────────────────────────────────────────
info "Настраиваю Nginx..."
sed "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" nginx/bot.conf > /etc/nginx/sites-available/restaurant-bot
ln -sf /etc/nginx/sites-available/restaurant-bot /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# ── SSL ──────────────────────────────────────────────────────────────────────
info "Получаю SSL-сертификат..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}" || \
  warn "SSL не настроен. Запусти вручную: certbot --nginx -d ${DOMAIN}"

echo ""
echo "======================================================"
info "Установка завершена!"
echo ""
echo "  Бот:    запущен через PM2"
echo "  Admin:  https://${DOMAIN}/admin"
echo "  Логин:  ${ADMIN_LOGIN}"
echo ""
echo "  Полезные команды:"
echo "  pm2 logs restaurant-bot"
echo "  pm2 restart restaurant-bot"
echo "======================================================"
