# Issue #25 — Hero Pacing, Tap-to-Merge & 5×5 Board Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Regulate hero hatching pace (≥2.5s cooldown, manual claim button, auto-receive toggle, 3-item queue + `+N` overflow), enable tap-to-select and tap-to-merge, increase inter-wave prep time to 4s with countdown, and optimize mobile 9:16 touch targets on the 5×5 board.

**Architecture:** Extend domain layer (`GameBalance`, `types`, `GameState`, `GameEngine`) to track an explicit FIFO `hatchQueue`, `hatchCooldownRemaining`, `autoReceiveHatch`, and `interWaveCountdown`. Enhance `DragController` with tap detection alongside existing drag mechanics. Update `HudRenderer` with queue items, claim button, auto toggle, and inter-wave countdown. Update `BoardRenderer`/`EntityRenderer` to highlight selected hero and merge candidates.

**Tech Stack:** TypeScript, Phaser 3, Vite, Vitest.

**Spec:** GitHub Issue #25 (`https://github.com/diepdo1810/mini-g/issues/25`), `AGENT.md`, `docs/DEV_WORKFLOW.md`.

## Global Constraints
- Preserve 5×5 grid, one hero per cell, hero types A & B, sword rotation, real collision checks.
- Do not modify ATK formulas, boss damage, level unlocks, or hatch weight probabilities.
- Egg count by level: L1: 1; L2–3: 2; L4–5: 3; L6–10: 4; L11+: 5.
- Pacing minimum interval: 2.5s (config-driven in `GameBalance.HATCH.MIN_INTERVAL`).
- Auto-receive defaults to `false`.
- Queue display: max 3 visible + `+N` overflow for 4+ items.
- Inter-wave delay: 4.0s (config-driven in `GameBalance.WAVES.INTER_WAVE_DELAY`).
- Clean separation between domain engine and Phaser rendering.
- All checks (`pnpm typecheck`, `pnpm test`, `pnpm build`) must pass without errors.

---

### Task 1: Domain Configuration & State Interfaces

**Files:**
- Modify: `src/game/config/GameBalance.ts`
- Modify: `src/game/domain/types.ts`
- Modify: `src/game/domain/GameState.ts`
- Modify: `src/game/domain/GameActions.ts`
- Test: `tests/hatch_pacing_types.test.ts`

**Interfaces:**
- Produces:
  - `GameBalance.HATCH.MIN_INTERVAL = 2.5`
  - `GameBalance.HATCH.DEFAULT_AUTO_RECEIVE = false`
  - `GameBalance.HATCH.MAX_VISIBLE_QUEUE = 3`
  - `GameBalance.WAVES.INTER_WAVE_DELAY = 4.0`
  - `interface QueuedHatchReward { eggId: string; slotIndex: number; reward: HatchReward; }`
  - `GameState` fields: `hatchQueue: QueuedHatchReward[]`, `autoReceiveHatch: boolean`, `hatchCooldownRemaining: number`, `interWaveRemaining?: number`, `selectedHeroId?: string`
  - `GameAction` variants: `CLAIM_HERO`, `TOGGLE_AUTO_RECEIVE`, `SELECT_HERO`

- [ ] **Step 1: Write failing test for domain interfaces and initial state**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Update `GameBalance.ts`, `types.ts`, `GameState.ts`, `GameActions.ts`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Verify all existing tests pass (`pnpm test`)**

---

### Task 2: GameEngine Pacing, Queue Management & Actions

**Files:**
- Modify: `src/game/domain/GameEngine.ts`
- Test: `tests/hero_pacing_engine.test.ts`
- Modify: `tests/egg_progression.test.ts` (update legacy immediate-hatch expectations if any)
- Modify: `tests/egg.test.ts`

**Interfaces:**
- Consumes: `QueuedHatchReward`, `GameBalance.HATCH`, `GameActions`
- Produces:
  - `engine.claimHatchReward(): boolean`
  - `engine.toggleAutoReceive(enabled?: boolean): void`
  - `engine.selectHero(heroId?: string): void`
  - `engine.getHatchCooldown(): number`
  - Guaranteed pacing: ≥2.5s between automatic hatches, at most 1 hatch per tick.
  - Overflow queue preservation when >3 eggs break (e.g. 4 eggs in Level 6–10).
  - Cooldown and board-full checks for manual claim.
  - Inter-wave delay of 4.0s with `interWaveRemaining` tracked during prep.

- [ ] **Step 1: Write comprehensive unit tests in `tests/hero_pacing_engine.test.ts`**
  - Test 1: Egg HP=0 adds to `hatchQueue` with reward; egg stays pending; does not spawn immediately when autoReceive is false.
  - Test 2: `CLAIM_HERO` spawns 1 hero, sets cooldown to 2.5s, decrements queue, resets corresponding egg.
  - Test 3: `CLAIM_HERO` fails during cooldown, when board is full (25 heroes), when paused, or when queue empty.
  - Test 4: Auto-receive ON hatches next hero only after ≥2.5s cooldown passes; never multiple in 1 tick.
  - Test 5: Queue overflow: when 4 eggs break in Level 6+, all 4 rewards are retained in FIFO order; `hatchQueue.length === 4`.
  - Test 6: Deterministic multi-egg break in same frame: stable FIFO queue by slotIndex.
  - Test 7: Inter-wave 4s countdown freezes on pause, resumes on resume.
- [ ] **Step 2: Run test to verify failures**
- [ ] **Step 3: Implement pacing, queue, manual claim, and inter-wave countdown in `GameEngine.ts`**
- [ ] **Step 4: Run `pnpm test` and adjust any legacy tests that assumed instant 0-delay hatching**
- [ ] **Step 5: Verify all unit tests pass**

---

### Task 3: Tap-to-Select and Tap-to-Merge Input Controller

**Files:**
- Modify: `src/game/input/DragController.ts`
- Modify: `src/game/render/EntityRenderer.ts`
- Test: `tests/tap_merge.test.ts`

**Interfaces:**
- Consumes: `GameEngine.getState().selectedHeroId`, `engine.dispatch`
- Produces:
  - Distinction between tap (< MIN_DISTANCE) and drag (>= MIN_DISTANCE).
  - Tap hero A: select A, highlight compatible merge candidates (same kind + tier).
  - Tap valid hero B: merge B into target (or A into B), clear selection.
  - Tap empty cell or invalid hero: clear selection without merging.
  - Drag functionality remains intact (drag to empty cell to move, drag to matching hero to merge, drag to egg to attack).
  - Selection cleared on blur, pointerupoutside, restart, and pause.

- [ ] **Step 1: Write unit tests in `tests/tap_merge.test.ts` simulating tap sequences**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Update `DragController.ts` to handle tap selection and tap merge**
- [ ] **Step 4: Update `EntityRenderer.ts` (or `DragController.render`) to highlight selected hero and merge candidates**
- [ ] **Step 5: Run tests and verify PASS**

---

### Task 4: HUD Queue Display, Claim Button, Auto Toggle & Inter-Wave Banner

**Files:**
- Modify: `src/game/render/HudRenderer.ts`
- Modify: `src/game/scenes/GameScene.ts`

**Interfaces:**
- Produces:
  - Display up to 3 queue badges with hero type & tier (e.g. `A1`, `B1`, `A2`).
  - Overflow indicator `+N` if `hatchQueue.length > 3`.
  - Claim button ("NHẬN HERO" or "NHẬN (2.1s)") with enabled/disabled visual states.
  - Auto-receive toggle button ("AUTO: TẮT" / "AUTO: BẬT").
  - Inter-wave banner showing "Chuẩn bị Wave N (Xs)" during wave prep.
  - Touch-friendly sizing (adequate padding, min height/width for mobile taps).

- [ ] **Step 1: Implement queue badges, claim button, auto-toggle, and inter-wave banner in `HudRenderer.ts`**
- [ ] **Step 2: Wire HUD callbacks in `GameScene.ts` (`onClaimHero`, `onToggleAutoReceive`)**
- [ ] **Step 3: Run `pnpm typecheck`, `pnpm test`, `pnpm build`**

---

### Task 5: Mobile 9:16 Viewport Verification & Manual Browser Playtest

**Files:**
- Verify: `360×640` and `412×915` viewports in headless/Playwright browser
- Test: `tests/mobile_viewport_audit.test.ts`

**Interfaces:**
- Verifies:
  - No clipping of board, outer path, eggs, HUD queue, or buttons on 360×640 and 412×915.
  - Usable touch target sizes (effective CSS px ≥ 44px where possible).
  - Tap-to-merge and drag-to-merge work in browser canvas.
  - Pacing and inter-wave countdown visually confirmable.

- [ ] **Step 1: Create a verification script/test checking element layouts and bounding boxes**
- [ ] **Step 2: Run browser check with Playwright MCP or puppeteer/vitest to capture screenshots at 360×640 and 412×915**
- [ ] **Step 3: Inspect layout and confirm no overlaps or clipping**

---

### Task 6: Final Verification, Git Commit, Push & PR Creation

- [ ] **Step 1: Run `pnpm typecheck`**
- [ ] **Step 2: Run `pnpm test`**
- [ ] **Step 3: Run `pnpm build`**
- [ ] **Step 4: Check git status and diff**
- [ ] **Step 5: Commit changes with reference to Issue #25**
- [ ] **Step 6: Push branch `feat/25-hero-pacing` to `origin`**
- [ ] **Step 7: Create PR to `master` with `Closes #25`**
- [ ] **Step 8: Post report directly to GitHub Issue #25**
