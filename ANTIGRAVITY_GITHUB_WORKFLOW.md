# Merge Defense — GitHub + Antigravity Workflow

Repository: https://github.com/diepdo1810/mini-g

## Roles
- Owner: decides gameplay, priority, accepts PRs.
- ChatGPT: writes and refines GitHub Issues, reviews PR/code and tests, reports progress using GitHub evidence. No background synchronization.
- Antigravity: reads Issues and docs, edits local source, executes tests, creates branch, commits, pushes and opens PR.

## Bootstrap (Issue #1)
1. Start in existing local game folder. Do NOT scaffold replacement.
2. Confirm files and remote. Check secrets before committing. Add `.gitignore` for node_modules, dist, .env*, local artifacts; keep `.env.example` if applicable.
3. If local git exists, inspect branch/history first. Never force push, reset, or rewrite existing history.
4. Connect origin to https://github.com/diepdo1810/mini-g.git; initialize only if not a Git repo.
5. Commit existing code and approved docs, push initial main branch. Repo initially empty.
6. Validate `pnpm install`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm dev` (only commands actually defined in package.json).
7. Add GitHub Actions CI for typecheck/test/build after inspecting package.json.
8. Report the SHA, commands, results and blockers on Issue #1. Do not close before owner acceptance.

## Every future Issue
1. Read specific GitHub Issue and linked docs. Respect spec precedence: `PRE_PHASE6_EGG_PROGRESSION_FIX.md` overrides older egg gameplay sections; `PHASE6_9_CAMPAIGN_PLAN.md` governs level campaign.
2. Work on one issue only. Branch name: `fix/2-multi-egg` or `feat/3-level-system` (adapt to issue number).
3. Update only in-scope code and tests. No new graphics/backend or unrelated refactor.
4. Commit with reference `#N`; push branch. Open PR targeting main with `Closes #N` only when acceptance criteria met, with tests and screenshots/playtest notes as relevant.
5. Keep PR unmerged until owner reviews/accepts. Owner may ask ChatGPT to review diff/tests and log findings.
6. Merge PR once approved and CI passes; GitHub closes linked Issue when merged into default branch.
7. Report task state as GitHub facts: issue state, PR state, CI checks, unresolved comments. Never say PASS based on agent claim alone.

## Issue statuses
- Backlog: issue open without active work.
- In progress: issue open, branch/PR in progress (GitHub Projects Status if configured, else `status:in-progress` label).
- Review: PR open, awaiting owner validation (GitHub Projects or `status:review`).
- Done: PR merged and issue closed after criteria accepted.
- Blocked: issue open, clearly state blocker in comment or `status:blocked` label.

## Daily routine
- Start: owner asks ChatGPT to summarize open issues and choose one next issue. ChatGPT checks GitHub.
- Coding: owner sends selected issue URL to Antigravity. Antigravity executes workflow and produces PR link.
- Review: owner sends PR URL to ChatGPT for diff/test review. User playtests game.
- End: owner requests recap; ChatGPT uses GitHub issue/PR evidence. Do not infer hours worked from issue count.

## Antigravity reusable prompt
Read AGENTS.md and docs/ANTIGRAVITY_GITHUB_WORKFLOW.md if present, then read the GitHub issue URL I provide. Modify existing project ONLY for that issue. Create issue-numbered branch, run defined pnpm scripts, write tests, commit and open PR targeting main. Include `Closes #N` in PR description and summarize acceptance criteria, checks and known issues. Do not merge or begin next issue without approval.
