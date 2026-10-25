# Merge Defense — Antigravity Agent Instructions

> Project: `diepdo1810/mini-g` · GitHub: https://github.com/diepdo1810/mini-g  
> Role: coding agent. Work **only** on the GitHub issue explicitly assigned by the owner.

## 1. Mission & scope

Build a small offline-first, portrait (9:16) mobile-friendly 2D game combining **2048 merge + tower defense + egg hatching**.

- Stack: **Phaser 3, TypeScript, Vite, pnpm**. Reuse existing project and dependencies.
- Use simple geometry for gameplay. **Do not** add polished sprites, multiplayer, accounts, backend, monetization, or unrelated features without an issue.
- Prefer small, testable changes. Avoid unrelated refactors, rewrites, premature abstractions, and dependency upgrades.
- Game rules must be separate from Phaser rendering/input where reasonably possible; keep game logic deterministic and unit-testable.
- Offline first; future online expansion must not require rewriting gameplay rules, but **do not build online now**.

## 2. Source of truth & conflict resolution

Before coding, read:
1. This `AGENT.md` (and the `AGENTS.md` discovery file).
2. The **assigned GitHub Issue** (title, full body, comments, dependencies, acceptance criteria).
3. `docs/DEV_WORKFLOW.md` (GitHub collaboration & CI); also read `docs/ANTIGRAVITY_GITHUB_WORKFLOW.md` if present.
4. Referenced specifications relevant to that issue, if present:
   - `docs/GAME_PLAN.md`: original gameplay/architecture.
   - `docs/PHASE3_FEEDBACK_EGG_COMBAT.md`: egg/combat collision feedback.
   - `docs/PRE_PHASE6_EGG_PROGRESSION_FIX.md`: latest egg count, progression, hatching; overrides earlier egg rules.
   - `docs/PHASE6_9_CAMPAIGN_PLAN.md`: campaign/levels/waves/bosses; apply compatible updates from the latest egg fix.
   - `docs/PHASE5_QA_PLAYTEST.md`: regression checklist.

Priority when documents disagree: **latest explicit owner decision in GitHub Issue > referenced fix specification > phase specification > original GAME_PLAN**. Document ambiguities in issue/PR. Do not invent new major gameplay rules.

If a referenced document is missing, report it; do not pretend you read it. Implement only verifiable requirements from available sources and request the missing specification if it blocks an acceptance criterion.

## 3. Core gameplay invariants (protect in all issues)

- Grid **5×5**; at most **one hero per cell**. Starting hero: **ATK 1**.
- Monsters travel a **single square loop** around the grid. Orbiting hero swords hit targets through real collision checks, with explicit cooldowns; avoid damage per frame.
- **Enemy damage does not reduce egg HP** unless the sword also actually collides with the egg. Enemy and egg have separate health, hit logic and cooldown.
- Dragging a hero onto an egg damages **that egg**; hero stays in its cell. Drag to an empty cell moves hero. Drag onto matching **type + tier** merges them (`1+1=2`, `2+2=4`, etc.). No duplication/loss of heroes.
- Hatching produces a hero on a vacant cell. If grid full, retain pending reward until space exists. Randomness must be injectable/testable. The guaranteed first Hero A / ATK 1 applies only to the tutorial Level 1 first hatch, not every replayed/advanced level unless spec explicitly changes.
- Egg count by level: **L1: 1; L2–3: 2; L4–5: 3; L6–10: 4; L11+: 5**; hard cap **5 active eggs**. Current campaign has 10 levels; do not create L11 without an issue.
- Win Boss L5 unlocks egg tier 2 for L6+; win Boss L10 unlocks tier 3 for future levels. Upgrade only after win, not mid-battle; replay respects level-specific egg cap and progression spec.
- Candidate hatch probabilities (subject to balancing issues): egg tier 1 → ATK1 100%; tier 2 → ATK1 50%, ATK2 50%; tier 3 → ATK1 20%, ATK2 60%, ATK4 20%. Keep hero type selection separate from hero power tier.
- Campaign: 10 levels, multiple waves; Boss at L5 and L10. Default **Base HP 3**; escaped normal enemy costs 1 HP, Boss costs 2; escape recorded **once**, only after completing route. Base HP 0 means Game Over; cleared level with HP > 0 means Victory. Level replay resets battle/hero team.
- Pause suspends the simulation clock (movement, sword rotation, damage cooldown, spawns and wave transitions); Restart clears transient state. Never let timers leak into a new game.
- Save unlocked levels, best stars and boss milestone progression offline with versioned data; tolerate missing/corrupt local save. No remote persistence for MVP.

These are guardrails, not authorization to implement future phase features during an earlier issue.

## 4. Required issue workflow

### Issue #1 — bootstrap exception (empty repository)

- **Use existing local source**. Inspect `git status`, `git remote -v`, branch/history, `package.json`, project tree, `.gitignore` before changes.
- Repository initially empty; connect `origin` to `https://github.com/diepdo1810/mini-g.git` carefully.
- Add relevant docs and these instruction files at repository root; preserve project history if it exists.
- Check for secrets before first commit. Never commit tokens, `.env`, credentials, generated artifacts or `node_modules`.
- Bootstrap initial `master` only if repository truly empty and safe to do so; no force push, history rewrite or destructive reset.
- Add README and CI only if within Issue #1 scope; run available verification scripts.
- Stop after Issue #1. Report commit SHA, pushed branch and checks. Do not begin Issue #2.

### Every issue after #1

1. Confirm correct repository and clean working tree. Read issue and linked docs; check dependency issues are accepted/closed before proceeding.
2. Create branch from updated `master`: `fix/<number>-short-slug`, `feat/<number>-short-slug` or `chore/<number>-short-slug`.
3. Implement only assigned acceptance criteria; update relevant unit tests and docs. Prefer config-driven levels/waves, explicit IDs and injectable random sources.
4. Run **existing scripts** from `package.json` (typically `pnpm typecheck`, `pnpm test`, `pnpm build`). Do not claim a missing script passed. Manually test affected drag/collision/rendering paths in a real browser when relevant.
5. Review `git diff`, check no unrelated files or secrets, then commit mentioning `#<number>`; push branch.
6. Open PR targeting `master`. CI runs automatically on the PR; don't claim PASS until check status confirms. Include `Closes #<number>` only when all required criteria are addressed; summarize behavior, proof of tests, manual steps/screenshots and unresolved issues.
7. **Do not self-merge, close the issue or start another issue.** Wait for owner acceptance. If blocked, leave an issue comment describing evidence and needed decision.

Never run `git push --force`, `git reset --hard`, destructive cleanup, or remove user files without explicit approval.

## 5. Definition of Done

- Acceptance criteria implemented **and** demonstrated, not just asserted.
- Relevant automated tests updated and passing; typecheck and production build passing, or explicit documented blocker.
- Drag & drop, rotating sword collisions, egg-specific damage, level transitions and pause/restart verified as applicable.
- Mobile 9:16 viewport has usable touch targets and no critical clipping on affected screens.
- PR diff focused, readable, with issue reference and reproduction/test notes.
- Owner has reviewed playtest and approved merge. **A coding-agent “PASS” report alone is not Done.**

## 6. Report format (post back to issue / owner)

```text
ISSUE: #<number> — <title>
STATUS: READY_FOR_REVIEW | BLOCKED | FAILED
BRANCH: <branch>
COMMIT: <SHA>
PR: <URL or not created>
CHANGED: <master files>
IMPLEMENTED: <short list>
CHECKS: typecheck <PASS/FAIL/NOT_AVAILABLE>; test <PASS/FAIL/NOT_AVAILABLE> (<count>); build <PASS/FAIL/NOT_AVAILABLE>
MANUAL: <what actually tested + result>
KNOWN ISSUES: <none or explicit list>
NEXT: Await owner review; do not start next issue
```

## 7. Collaboration contract

- **Owner:** product decisions, prioritization, actual gameplay acceptance and merge approval.
- **ChatGPT:** issue planning, acceptance criteria, PR/code review and progress summaries using GitHub evidence. No background sync implied.
- **Antigravity:** local implementation, test evidence, branch/PR, clear blocking questions.

One source of truth for implementation status: GitHub Issues + Pull Requests. Notion may store design notes, but don't create duplicate tasks or synchronize state unless explicitly requested.
