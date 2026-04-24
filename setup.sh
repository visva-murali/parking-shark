#!/bin/bash
# Parking Shark — one-shot local setup + launch.
# Run once: bash setup.sh
# Then afterwards just: npm run dev

set -e
cd "$(dirname "$0")"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠ $*${NC}"; }
die()  { echo -e "${RED}✘ $*${NC}"; exit 1; }

echo ""
echo "🦈  Parking Shark — local setup"
echo "================================"

# ── 1. MySQL running? ────────────────────────────────────────────────────────
if brew services list 2>/dev/null | grep -q "mysql.*started"; then
  ok "MySQL already running"
else
  warn "Starting MySQL via Homebrew..."
  brew services start mysql || die "Could not start MySQL. Is it installed? (brew install mysql)"
  sleep 2
  ok "MySQL started"
fi

# ── 2. .env ──────────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  # Generate a real session secret.
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s/SESSION_SECRET=change_me_to_a_long_random_string/SESSION_SECRET=$SECRET/" .env
  else
    sed -i "s/SESSION_SECRET=change_me_to_a_long_random_string/SESSION_SECRET=$SECRET/" .env
  fi
  warn ".env created from .env.example. Using root with no password for local dev."
  warn "If your MySQL root has a password, edit .env and set DB_USER=root DB_PASS=yourpassword"
  # Use root for dev convenience (no password set by default on brew mysql)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' 's/DB_USER=ps_app/DB_USER=root/' .env
    sed -i '' 's/DB_PASS=replace_me/DB_PASS=/' .env
  else
    sed -i 's/DB_USER=ps_app/DB_USER=root/' .env
    sed -i 's/DB_PASS=replace_me/DB_PASS=/' .env
  fi
  ok ".env ready"
else
  ok ".env already exists"
fi

# Load env so we can pass credentials to mysql.
export $(grep -v '^#' .env | grep -v '^$' | xargs)
MYSQL_CMD="mysql -u ${DB_USER:-root}"
if [ -n "$DB_PASS" ]; then MYSQL_CMD="$MYSQL_CMD -p$DB_PASS"; fi

# ── 3. npm install ───────────────────────────────────────────────────────────
if [ ! -d node_modules ]; then
  echo "Installing npm packages..."
  npm install --no-audit --no-fund
  ok "npm packages installed"
else
  ok "node_modules present"
fi

# ── 4. Database setup ────────────────────────────────────────────────────────
DB_EXISTS=$($MYSQL_CMD -e "SHOW DATABASES LIKE 'parking_shark';" 2>/dev/null | grep -c parking_shark || true)

if [ "$DB_EXISTS" -eq "0" ]; then
  echo "Setting up database (this takes ~5 sec)..."
  $MYSQL_CMD < sql/schema.sql          && ok "schema.sql applied"
  $MYSQL_CMD < sql/migration_auth.sql  && ok "migration_auth.sql applied"
  # grants.sql creates ps_app/ps_dev — skip in dev, we use root directly.
  ok "Database 'parking_shark' ready with seed data"
else
  ok "Database 'parking_shark' already exists — skipping schema import"
  warn "To wipe and reimport: mysql -u root -e 'DROP DATABASE parking_shark;' then re-run this script"
fi

# ── 5. Launch ─────────────────────────────────────────────────────────────────
echo ""
ok "All set. Starting app..."
echo ""
echo "  http://localhost:3000"
echo ""
echo "  Demo login:  fh@virginia.edu  /  password123  (renter)"
echo "               ac@virginia.edu  /  password123  (host + admin)"
echo ""
echo "  Press Ctrl+C to stop."
echo ""
npm run dev
