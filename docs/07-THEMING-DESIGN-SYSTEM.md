# Obiectiv
Un Design System care permite schimbarea calității grafice rapid, fără refactor masiv.
Regula: **tokens -> primitives -> composites -> overlays**.

## 1) Tokens (Theme Tokens)
Fiecare temă definește:

### Colors
- `bg0`, `bg1` (fundaluri)
- `panel` (glass/solid panel)
- `text`, `muted`
- `accent`, `accent2`
- `danger`, `success`, `warning`
- `stroke` (border subtle)

### Typography
- `displayFamily` (titluri)
- `bodyFamily`
- `weightDisplay`, `weightBody`
- `trackingDisplay`
- `numbers: "tabular-nums"`

### Radii & Spacing
- `radii: { sm, md, lg, xl }`
- `space: { 1..10 }`

### Shadows & Effects
- `shadowSoft`, `shadowHard`, `glowAccent`
- `glass: { bg, blur, border }`

### Motion
- `durations: { fast, base, slow }`
- `easing: { enter, exit }`

## 2) Primitive Components (reutilizabile)
Acestea NU cunosc fotbal; sunt doar UI.
- `Panel` (solid/glass)
- `Badge`
- `Divider`
- `TeamPill` (logo + shortName)
- `Digits` (score/time, tabular)
- `Toast` (event toast)
- `Marquee` (ticker scrolling)

Toate primesc `theme` și props simple.

## 3) Composite Components (football aware)
- `Scoreboard`
- `MatchClock`
- `EventRibbon` / `EventToastStack`
- `MultiMatchRow`
- `LineupPitch2D`
- `StatsMiniPanel`

## 4) Overlay Layout rules
### 16:9 (1920×1080)
- Safe padding: 60px
- Scoreboard: top-left (sau top-center în unele teme)
- Ticker: bottom full-width, height fix (48–64px)

### 9:16 (1080×1920)
- Safe padding: 48px
- Scoreboard: top (stacked)
- Ticker: bottom (stacked sau list)
- Evită text lung: folosește shortName + ellipsis

## 5) Broadcast legibility rules
- Contrast: text alb pe panel închis; accent doar pentru highlights.
- No layout shift: fix widths pentru digits/labels.
- Folosește `font-variant-numeric: tabular-nums;`
- Evită pattern-uri puternice sub text (pattern doar pe margini sau foarte subtil).

## 6) Theme authoring guide
Când adaugi o temă nouă:
1) definește tokens (culori, tipografie, radii, shadows, motion)
2) definește “signature” minimal (ex: accent glow / hard drop shadow)
3) NU modifica layout, doar stil (primitives/composites)

## 7) Calitate: “Quality Gates”
- HUD trebuie să fie lizibil pe:
  - fundal luminos (meci zi)
  - fundal întunecat (meci noapte)
- Verifică la 70% scale în OBS (ca pe stream).
- Testează cu scoruri 0–0, 10–0, minute 1, 45+3, 90+7.

## 8) Font strategy
Recomandat:
- font-uri locale în `assets/fonts`
- fallback: system fonts
- evită încărcare dinamică în runtime pentru overlays (reduce flash).
