# Stantia Legal (local mirror)

Editable copy of the public legal + help site (English + Spanish).

**Published site:** [`stantia-app-legal`](https://github.com/Fermacu/stantia-app-legal)  
(GitHub Pages — prefer editing that repo, then sync here.)

## Languages

- **English** (default / `x-default`): root paths (`/`, `/privacy/`, …)
- **Spanish**: under `/es/` (`/es/`, `/es/privacy/`, …)

Each page has an EN | ES switcher. `js/site.js` remembers the choice and, on first visit, may redirect Spanish browsers to `/es/`.

## Public URLs

| Page | English | Spanish |
| --- | --- | --- |
| Home | https://fermacu.github.io/stantia-app-legal/ | https://fermacu.github.io/stantia-app-legal/es/ |
| Help & Guides | https://fermacu.github.io/stantia-app-legal/help/ | https://fermacu.github.io/stantia-app-legal/es/help/ |
| Privacy Policy | https://fermacu.github.io/stantia-app-legal/privacy/ | https://fermacu.github.io/stantia-app-legal/es/privacy/ |
| Terms | https://fermacu.github.io/stantia-app-legal/terms/ | https://fermacu.github.io/stantia-app-legal/es/terms/ |
| Delete account | https://fermacu.github.io/stantia-app-legal/delete-account/ | https://fermacu.github.io/stantia-app-legal/es/delete-account/ |

## When you change copy

1. Edit in `~/Documents/Github/stantia-app-legal` (source of truth for Pages), **or** edit this mirror then sync out.
2. Keep both locales in sync when you change shared structure (nav, switcher, assets).
3. Sync into this folder (`apps/legal/`) so the monorepo mirror stays current.
4. Push `stantia-app-legal` to GitHub so Pages updates.

Do **not** re-enable GitHub Pages on the private app code repo for this site.

## Preview locally

```bash
npx --yes serve .
```
