# Prompt Antigravity — bắt đầu Phase 6

Đọc toàn bộ:
- `docs/GAME_PLAN.md`
- `docs/PHASE3_FEEDBACK_EGG_COMBAT.md`
- `docs/PHASE5_QA_PLAYTEST.md`
- `docs/PHASE6_9_CAMPAIGN_PLAN.md` (**ưu tiên tài liệu này nếu luật cũ xung đột**).

Sửa trực tiếp project hiện tại. **Chỉ triển khai PHASE 6**: LevelConfig data-driven, Level Map 10 màn, lưu tiến trình IndexedDB, unlock/replay, dùng wave config theo từng màn. Giữ nguyên combat, trứng, kéo, ghép hiện có. Chưa triển khai boss và gameplay Phase 7–9.

Trước khi code: kiểm tra kiến trúc và tests cũ, lập checklist file cần sửa. Sau khi code: chạy `pnpm typecheck`, `pnpm test`, `pnpm build`, test flow Map → Level 1 → Victory → Level 2 → reload.

Báo cáo theo format cuối `PHASE6_9_CAMPAIGN_PLAN.md`. Không chuyển Phase 7 nếu chưa có xác nhận.
