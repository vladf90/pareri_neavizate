# watchalong-graphics — doc pack

Acest folder conține documentația + tipurile shared (shared) pentru proiect.

## Ce include
- `docs/*.md` — specificație + arhitectură + WS + SportMonks + design system + TipeeStream + prompt final
- `shared/src/*` — internal models + WS events + constants
- `.env.example`

## Overlays Disponibile
- **Master Overlay** — All-in-one overlay cu toate widgetele
- **Starting Soon** — Pre-stream countdown
- **Scoreboard** — Live match score
- **Lineups** — Team formations (home/away/both)
- **Standings** — League table
- **Live Standings** — Vertical standings (9:16)
- **TipeeStream Alerts** — Donations & subscriptions (standalone) → [Documentație](docs/TIPEESTREAM-INTEGRATION.md)

## Cum folosești
1) Copiază acest folder în repo-ul tău (sau pornește un repo nou).
2) Dă AI-ului fișierul `docs/99-AI-BUILD-PROMPT.md` + cele referite în el.
3) Ajustează orice detaliu în docs, apoi regenerează build-ul.
4) Pentru TipeeStream, configurează `TIPEESTREAM_API_KEY` în `.env`

