#!/usr/bin/env bash
# Import schema + seed when XAMPP MySQL is running.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MYSQL="${MYSQL_BIN:-/Applications/XAMPP/xamppfiles/bin/mysql}"
PHP="${PHP_BIN:-/Applications/XAMPP/xamppfiles/bin/php}"

if ! "$MYSQL" -u root -e "SELECT 1" >/dev/null 2>&1; then
  echo "MySQL is not running. Start it from the XAMPP Control Panel, then re-run."
  exit 1
fi

"$MYSQL" -u root < "$ROOT/sql/schema.sql"
"$PHP" "$ROOT/sql/seed_from_json.php"
echo "Database ready."
