# Circuit Media (PHP + MySQL)

Full PHP 8.2 rewrite of Circuit Media for **XAMPP** and classic shared hosting (upload via file manager). Live specs, MySQL catalog, recommend/compare/search, admin, and optional AI endpoints.

## Requirements

- PHP 8.2+ (XAMPP includes 8.2.4)
- Apache with `mod_rewrite`
- MySQL / MariaDB (optional at first run — app falls back to `data/devices.json`)

## Local setup (XAMPP)

1. Start **Apache** and **MySQL** from the XAMPP Control Panel (MySQL needs admin rights on macOS).
2. Open [http://localhost/Circut_Media_Review_Website_php/](http://localhost/Circut_Media_Review_Website_php/)
3. Configure secrets:

```bash
cp config/env.example.php config/env.php
# edit DB credentials / API keys if needed
```

4. Create schema and seed (when MySQL is running):

```bash
/Applications/XAMPP/xamppfiles/bin/mysql -u root < sql/schema.sql
/Applications/XAMPP/xamppfiles/bin/php sql/seed_from_json.php
```

Default XAMPP DB settings in `config/env.php`: host `127.0.0.1`, database `circuit_media`, user `root`, empty password.

## Shared hosting upload

1. Upload this project folder (exclude `_reference_next/` if you want a smaller upload).
2. Point the site document root at this folder (or a subdirectory).
3. Adjust `RewriteBase` in `.htaccess` and `base_path` / `site_url` in `config/env.php` to match the public URL.
4. Create a MySQL database in the host panel, update `config/env.php`, import `sql/schema.sql`, then run `sql/seed_from_json.php` over SSH or upload a pre-seeded dump.

## Main routes

| Path | Purpose |
|------|---------|
| `/` | Home + live interest rankings |
| `/phones`, `/tablets`, `/watches`, `/devices` | Category browse |
| `/phones/{slug}` (etc.) | Product detail |
| `/brands`, `/brands/{slug}` | Brand directory |
| `/search`, `/compare`, `/recommend`, `/reviews` | Tools |
| `/admin` | Import / verify UI |
| `/api/*` | JSON APIs (same contracts as the Next.js app) |

## Configuration

| Key | Role |
|-----|------|
| `specs_api_url` | Live GSMArena-backed specs API |
| `device_api_*` | Optional MobileAPI |
| `ai_api_*` | Optional OpenAI-compatible narrative layer |
| `admin_api_token` | Bearer token for `/api/admin/*` |

## Project layout

```
index.php          Front controller
.htaccess          Pretty URLs
config/            env + site config
sql/               schema + seed script
src/               Router, controllers, services
views/             PHP templates
assets/            CSS, JS, images
data/              devices.json symlink + caches
_reference_next/   Original Next.js tree (reference only)
```

## Notes

- Without MySQL, catalog/search/recommend still work from `data/devices.json`.
- Live browse prefers the specs API; local catalog is the offline / scoring fallback.
- Do not commit real API keys — keep them in `config/env.php` (gitignored).
