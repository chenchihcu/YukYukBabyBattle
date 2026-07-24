---
name: run-tank-front-1988
description: Build, run, and drive the 禹旭寶貝大作戰 (Tank Front 1988) tank battle game round by round as a player, using the Playwright MCP browser tools plus the in-app `window.__TANK_DEBUG__` state hook. Use when asked to start/run/screenshot the game, play a stage, debug gameplay, or verify a fix actually works in the browser (not just tests/build).
---

Web app (Vite dev server, HTML5 Canvas). Drive it with the **Playwright MCP
plugin** (`mcp__plugin_playwright_playwright__*`) — it writes real PNG
screenshots to disk and its `browser_press_key` / `browser_click` /
`browser_evaluate` all work reliably headless. Pair it with the dev-only
debug hook `window.__TANK_DEBUG__` (added in `src/main.js`) to read exact
game state — stage, lives, score, player/enemy positions, engine `state`
machine — instead of guessing from pixels.

Do **not** use the built-in `mcp__Claude_Browser__*` "Browser pane" tools for
this game: in this environment its `computer{action:"screenshot"}` reliably
fails with "the Browser pane is not displayed" when no one has the pane open
on screen, so it cannot produce the proof screenshot this skill needs. `read_page`
/ ref-based clicks on it do work, but there's no reason to use it over
Playwright MCP, which has no such caveat.

All paths below are relative to the repo root (`坦克大戰/`).

## Prerequisites

None beyond the repo's own `npm install` — no OS packages needed. Verified
on Windows in this container; no browser binaries needed to be installed
separately (Playwright MCP ships its own).

## Setup / Build

```bash
npm install
node test_200_stages.js   # mandatory per AGENTS.md — validates all 200 stage layouts
npm run build              # mandatory per AGENTS.md — must build with 0 errors
```

Both must pass before and after any gameplay-affecting change (per
[AGENTS.md](../../../AGENTS.md)).

## Run (agent path) — dev server + Playwright MCP

1. Start the dev server (do **not** use Bash for this — use the preview tool):
   `mcp__Claude_Browser__preview_start` with `{"name": "dev"}` (config already
   in [.claude/launch.json](../../launch.json), port 5173). This only needs
   to run once; leave it running.
2. Drive the page with the Playwright MCP plugin tools, not the Browser pane:
   - `mcp__plugin_playwright_playwright__browser_navigate` → `{"url": "http://localhost:5173"}`
   - `mcp__plugin_playwright_playwright__browser_snapshot` → get element refs (menu buttons etc.)
   - `mcp__plugin_playwright_playwright__browser_click` → `{"target": "#btn-start-game"}` (CSS selector or a snapshot ref both work as `target`)
   - `mcp__plugin_playwright_playwright__browser_press_key` → `{"key": "w"}` / `"a"` / `"s"` / `"d"` (move), `"Space"` (shoot), `"p"` (pause)
   - `mcp__plugin_playwright_playwright__browser_evaluate` → read `window.__TANK_DEBUG__` (see below)
   - `mcp__plugin_playwright_playwright__browser_take_screenshot` → `{"type":"png","scale":"css","filename":"<label>.png"}`
   - `mcp__plugin_playwright_playwright__browser_console_messages` → `{"level":"error"}` after every few actions

Screenshots land at repo root by default (Playwright MCP's cwd), e.g.
`round1-gameover.png`. Pass a path under
`.claude/skills/run-tank-front-1988/screenshots/` as `filename` to keep them
out of the repo root (that subfolder is gitignored).

### The debug hook — `window.__TANK_DEBUG__`

`src/main.js` exposes engine internals on `window` **only in dev builds**
(`if (import.meta.env.DEV) window.__TANK_DEBUG__ = { gameEngine, levelManager,
audioEngine, weaponsManager }`). Vite tree-shakes this out of `npm run build`
output entirely — confirmed via `grep -c __TANK_DEBUG__ dist/assets/*.js` → `0`.
This is the fast path for round-by-round debugging: read exact state instead
of inferring it from a screenshot.

Use it through `browser_evaluate`, e.g.:

```js
() => {
  const g = window.__TANK_DEBUG__.gameEngine;
  return {
    state: g.state,                              // START | PLAYING | VICTORY | GAME_OVER
    stage: window.__TANK_DEBUG__.levelManager.currentStage,
    score: g.score,
    lives1: g.lives1, lives2: g.lives2,
    enemiesRemaining: g.enemiesRemaining,
    enemiesOnField: g.enemiesOnField.map(e => ({ x: e.x, y: e.y, type: e.type, alive: e.alive })),
    bullets: g.bullets.length,
    p1: { x: g.player1.x, y: g.player1.y, alive: g.player1.alive },
  };
}
```

Useful direct-invocation shortcuts for skipping grind while testing round
transitions (call via the same `browser_evaluate`):
- `g.setControlMode('keyboard')` — switch off mouse-aim so WASD alone
  drives movement *and* facing (default mode `mouse_keyboard` needs a mouse
  position for aim direction, which is awkward to script).
- `g.victory()` — force an immediate stage-clear to reach the tally/next-stage
  screen without killing 20 enemies first.
- `g.gameOver()` — force the failure tally screen.

### One verified round-by-round flow

This exact sequence was run in this container and is the reference path:

1. `browser_navigate` to `http://localhost:5173` → menu screen.
2. `browser_click` `{"target": "text=⚔️ 開始作戰"}` → starts Stage 1, `state` becomes `PLAYING`.
3. `browser_evaluate` `g.setControlMode('keyboard')`.
4. `browser_press_key` `w`/`a`/`s`/`d` to move, `Space` to shoot.
5. `browser_evaluate` to read `state`/`lives1`/`enemiesRemaining` after every couple of inputs — this *is* "round by round": each poll is one snapshot of the round.
6. On death, `state` → `GAME_OVER` and the tally overlay (`#score-tally-overlay`) appears; `browser_click` `{"target": "#btn-tally-continue"}` retries the same stage.
7. On stage clear, `state` → `VICTORY`; the same continue button instead advances `levelManager.currentStage + 1`.
8. `browser_take_screenshot` at any point for visual proof; `browser_console_messages {"level":"error"}` to catch thrown exceptions.

## Run (human path)

```bash
npm run dev
```
Open `http://localhost:5173` in a real browser. Ctrl-C to stop. No use for
an agent — no way to observe pixels or state without a driver.

## Test

```bash
node test_200_stages.js
```
Expect: `✅ 200 關全部通過驗證！地形陣列 100% 完整無瑕疵，出生點完全安全！`

---

## Gotchas

- **Built-in Browser pane screenshots fail here, Playwright MCP's don't.**
  `mcp__Claude_Browser__computer{action:"screenshot"}` errors with "the
  Browser pane is not displayed, so the page is not compositing frames" when
  running without an open pane — DOM reads/ref-clicks on it still work, but
  it cannot produce a screenshot file. `mcp__plugin_playwright_playwright__browser_take_screenshot`
  has no such dependency and always writes a real PNG. Use Playwright MCP as
  the primary driver for this reason alone.
- **Default control mode needs a mouse, not just keys.** `controlMode` starts
  as `'mouse_keyboard'` — aim direction comes from cursor position, WASD only
  moves. Scripting mouse position over a canvas is fiddly; switch to
  `'keyboard'` mode (`g.setControlMode('keyboard')` or the ⚙️ 戰術設定 drawer
  → ⌨️ 四向方向鍵/WASD button) so the last movement key also sets facing/shoot
  direction.
- **The ⚙️ 戰術設定 (settings) button is inert on the main menu.** It's
  behind the full-screen `#game-overlay`; clicking it before `btn-start-game`
  does nothing (confirmed: click landed, `#settings-drawer-overlay` stayed
  `hidden`). Start a stage first, *then* open settings.
- **`browser_press_key` is a tap (down+up), and the game runs on real
  wall-clock `requestAnimationFrame`.** Round-trip latency between tool calls
  means several real seconds can pass between your inputs while enemies keep
  firing. Standing still while you issue a handful of movement commands is
  enough to lose all 3 lives for real — that's automation latency, not a
  difficulty bug. Don't mistake a fast `GAME_OVER` during slow scripted play
  for a balance issue; corroborate with `enemiesOnField` positions/damage
  before concluding anything's wrong.
- **Retrying after `GAME_OVER` intentionally leaves you at 1 life, not 3.**
  `Engine.js` `startStage()`: `if (this.lives1 <= 0) this.lives1 = 1;` — a
  soft-continue, confirmed by reading `lives1` before/after clicking
  `#btn-tally-continue`. Looks like a reset bug at first glance; it isn't.

## Issues found and fixed via this driver (round-by-round play, 2026-07-24)

Both found by actually playing (menu → start → move/shoot → die → tally →
retry → clear → tally), not by reading code. Both fixed same session and
re-verified live with this same driver:

- **Tally continue button label was wrong on failure.** `#btn-tally-continue`
  used one hardcoded label for both victory and failure, but on failure the
  handler retries the *same* stage, not the next one. `runScoreTallyAnimation()`
  in [src/main.js](../../../src/main.js) now sets the label per `isVictory`:
  `⚔️ 進入下一關 (SPACE)` on clear, `🔁 重新挑戰 (SPACE)` on failure. Re-verified:
  `g.gameOver()` → tally shows `🔁 重新挑戰 (SPACE)`; `g.victory()` → tally shows
  `⚔️ 進入下一關 (SPACE)`.
- **The advertised SPACE shortcut did nothing on the tally screen.** The
  global `keydown` handler only checked `#game-overlay` (the main menu) for
  `Enter`/`Space`, never `#score-tally-overlay`. Continue logic was factored
  into `continueFromTally()` and the keydown handler now calls it when the
  tally overlay is visible. Re-verified: `browser_press_key {"key":"Space"}`
  on the failure tally now moves `state` `GAME_OVER` → `PLAYING` (stage
  retried); on the victory tally it advances `levelManager.currentStage`
  (1 → 2), matching a real click on `#btn-tally-continue`.

Screenshot proof: [round1-gameover.png](screenshots/round1-gameover.png) (bug,
pre-fix), [round2-fix-verified-stage2.png](screenshots/round2-fix-verified-stage2.png)
(post-fix, Space-advanced into Stage 002 with a full HUD).
