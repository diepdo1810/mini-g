# Prompt Antigravity — Multi-Egg & Boss Evolution Fix

Đọc toàn bộ `docs/PRE_PHASE6_EGG_PROGRESSION_FIX.md` và đối chiếu với `docs/GAME_PLAN.md`, `docs/PHASE3_FEEDBACK_EGG_COMBAT.md`, `docs/PHASE5_QA_PLAYTEST.md`, `docs/PHASE6_9_CAMPAIGN_PLAN.md`.

**Chỉ triển khai bản fix MD-FIX-EGG-01 trên project hiện tại, trước Phase 6–9.** Tài liệu fix ưu tiên khi xung đột về trứng.

Yêu cầu:
1. Hỗ trợ tối đa 5 trứng độc lập, số trứng theo level; trứng nằm gần bàn cờ và không chồng hitbox.
2. Qua Boss mở khóa cấp trứng mới, áp dụng từ màn sau; trứng cấp cao có tỷ lệ mở hero mạnh hơn.
3. Giữ kiếm xoay tự chém trứng và drag đập trứng; tách damage trứng/quái, cooldown từng mục tiêu.
4. Không phá cơ chế merge, wave, pause, restart, save cũ. Dùng hình học, không làm sprite/backend.
5. Viết test cho tất cả acceptance cases; chạy `pnpm typecheck`, `pnpm test`, `pnpm build` và test 9:16.

Nếu campaign Phase 6 chưa tồn tại, triển khai resolver cấu hình và test milestone bằng mock, **không tự làm Phase 6**.

Báo cáo theo mục 8 trong tài liệu fix. **Dừng sau khi fix hoàn thành, chờ duyệt.**
