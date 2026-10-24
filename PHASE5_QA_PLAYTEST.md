# MERGE DEFENSE — PHASE 5: QA, PLAYTEST & OFFLINE MVP

> 24/10/2026. Gửi Antigravity. Áp dụng cho **project hiện tại**.
> Đọc cùng `docs/GAME_PLAN.md` và `docs/PHASE3_FEEDBACK_EGG_COMBAT.md`.
> Phase 4 được báo cáo PASS (40/40 test); **chưa coi là QA thực tế** nếu chưa kiểm chứng các tình huống dưới đây.

## 1. Mục tiêu và phạm vi

- Hoàn thiện bản prototype offline có thể chơi trọn từ Wave 1 đến Wave 5.
- **Không tạo project mới.** Không thêm sprite, backend, tài khoản, quảng cáo, kỹ năng hoặc gameplay ngoài đặc tả.
- Chỉ sửa bug đã tái hiện, cải thiện bố cục/input, cân bằng qua playtest. Không refactor lớn khi không cần.
- Giữ `GameEngine` quyết định luật chơi; Phaser chỉ phụ trách input/render.

## 2. P0 — Bắt buộc xác minh trước khi chốt

### P0.1. Sát thương chính xác

- Kiếm đánh trúng **quái**, không chạm trứng: `monster.hp` giảm, `egg.hp` **không đổi**.
- Kiếm trực tiếp chạm trứng: `egg.hp` giảm đúng ATK, với cooldown hợp lệ.
- Kéo hero vào trứng rồi thả: **1 lần giảm HP** theo ATK; hero đứng nguyên ô; không bị tính thêm 1 hit do thao tác thả.
- Nếu kiếm va chạm cả quái và trứng, tính từng mục tiêu độc lập; không dùng chung HP/cooldown gây mất máu sai.
- Trứng 0 HP chỉ nở **một lần**; không sinh trùng nhân vật ở cùng ô.

### P0.2. Vị trí và tầm đánh trứng

- Trứng đặt **gần phía dưới vòng quái**, không đè đường quái, bàn cờ, HUD.
- Hero ở **hàng cuối, cột giữa** có thể tự chém trứng khi kiếm xoay.
- Hero ở hàng trên không chém xuyên bàn cờ tới trứng.
- Tính vị trí/hitbox theo kích thước canvas; kiểm tra trên màn hình dọc và sau resize.

### P0.3. Luật Wave và thắng/thua

- Wave 1 → 5 với thông số trong `GameBalance.ts`; spawn đúng số quái và giãn cách 2.5 giây.
- Chỉ sang wave mới khi đã **spawn đủ** và tất cả quái của wave hiện tại đã chết/thoát; đợi 2 giây theo thời gian game (không phải thời gian thật khi pause).
- Quái bị hạ: tăng `Kills` **1 lần**. Quái đi hết vòng: căn cứ mất **1 HP**, không tăng `Kills`.
- `Base HP <= 0` kích hoạt GAME OVER ngay; không tự chuyển wave hay VICTORY sau đó.
- Sau Wave 5, nếu mọi quái đã kết thúc và `Base HP > 0`: VICTORY.
- Pause ngừng mọi cập nhật gameplay (quái, kiếm, trứng, cooldown, wave, spawn); thao tác kéo/ghép không làm thay đổi trạng thái trong Pause, Game Over hoặc Victory.
- Restart từ mọi trạng thái về đúng **1 hero A ATK 1 tại (0,2)**, Base HP 3, Wave 1, Kills 0, Egg HP 3; không còn timer/event cũ.

### P0.4. Quy tắc nở/ghép

- Trứng đầu luôn nở A ATK 1; từ trứng 2 phân bố A/B 50/50 theo nguồn random có thể kiểm thử.
- HP trứng mới: `3 + 2 * hatchCount` (3, 5, 7, ...).
- 25 ô đầy: không làm mất phần thưởng; giữ pending, nở khi ghép giải phóng ô.
- Kéo vào ô trống để di chuyển, không clone hero.
- Chỉ ghép cùng loại và cùng tier: `1+1=2`, `2+2=4`; không ghép A+B hoặc khác tier.

## 3. P1 — Trải nghiệm người chơi

- Desktop: kéo bằng chuột; mobile: kéo bằng touch/pointer; khi kéo game không bị cuộn trang hay chọn chữ.
- 9:16: bàn cờ, đường quái, trứng, HP, Pause/Resume, Restart đều nhìn thấy; vùng bấm đủ dễ trên điện thoại.
- Sau resize/orientation, vùng vẽ và hitbox vẫn khớp; không dùng tọa độ hard-code chỉ đúng 1 kích thước.
- Đòn đánh có phản hồi ngắn: quái/trứng nháy hoặc số sát thương; hero đang kéo có preview; ô ghép hợp lệ/sai có highlight.
- Khi wave kết thúc, banner ngắn gọn; không che khuất thao tác kéo quá lâu.
- Không xuất hiện trạng thái khó hiểu khi đang kéo rồi tab mất focus, pause hoặc restart: hủy drag an toàn.

## 4. P1 — Playtest và cân bằng

Thử ít nhất 3 lượt từ đầu đến cuối; ghi kết quả, **không tự thêm feature**:

1. **Không thao tác**: quái tiến triển đúng, thua khi 3 con thoát; không treo wave. Nếu hero tự đánh được quái thì ghi lại diễn biến thực tế.
2. **Chơi chủ động**: kéo đập trứng, di chuyển hero về cạnh đường quái, ghép; phải có đường đi thực tế dẫn tới VICTORY.
3. **Thao tác liên tục**: đập trứng và ghép nhanh; không duplicate, âm HP, mất hero, hoặc crash.

Ghi thời lượng lượt chơi, wave thua/thắng, số hero từng tier, số trứng mở, cảm giác khó/dễ, khoảng thời gian không có việc để làm. Chỉ tinh chỉnh các hằng số trong `GameBalance.ts` nếu playtest chứng minh cần; nêu giá trị trước/sau và lý do.

## 5. Kiểm thử tự động cần có

- Test logic với thời gian giả / seed RNG, không phụ thuộc rendering hay `setTimeout` thật.
- Thêm regression test cho P0.1: đánh quái không trừ trứng; trứng tự nhận hit khi kiếm chạm; kéo trứng đúng 1 hit.
- Test trạng thái cuối wave, nhiều quái, die/escape, `Base HP = 0`, ưu tiên GAME OVER; inter-wave delay và Pause.
- Test Restart giữa wave, lúc pause, khi Victory/Game Over; không giữ lại timers, monsters, heroes, drag state.
- Test full board pending hatch, ghép giải phóng ô, RNG deterministic.
- Đảm bảo mỗi lượt chỉ có một loop/update/event listener có hiệu lực sau Restart.

## 6. Lệnh và kiểm tra thủ công

- Chạy lệnh có sẵn trong `package.json`; tối thiểu: `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Mở `pnpm dev` trên desktop và viewport mobile 9:16 bằng Playwright.
- Ghi rõ các test **đã thực sự chạy** và test **chưa kiểm được**; không báo PASS thay kiểm thử bằng suy đoán.
- Kiểm tra console errors, FPS/sự giật khi nhiều hero/quái, listener leak sau ít nhất 10 lần Restart.
- Làm `README.md`: yêu cầu môi trường, cài đặt, lệnh chạy/test/build, luật chơi, điều khiển chuột/touch, giới hạn MVP.

## 7. Điều kiện nghiệm thu Phase 5

- [ ] Mọi mục P0 có bằng chứng test hoặc Playwright.
- [ ] Hoàn thành ít nhất 1 lượt VICTORY và 1 lượt GAME OVER hợp lệ.
- [ ] Mobile 9:16 kéo/thả hoạt động; layout không cắt trứng/UI.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build` đều PASS.
- [ ] Không có lỗi runtime hoặc state leak quan sát được.
- [ ] README cập nhật; ghi rõ các vấn đề chưa xử lý.

## 8. Format báo cáo Antigravity

```text
PHASE: 5
STATUS: PASS | FAIL | PARTIAL
FILES CHANGED:
FIXED:
TESTS ADDED:
CHECKS: typecheck / test N/N / build
MANUAL PLAYTEST:
- Desktop:
- Mobile 9:16:
- Victory / Game Over:
- 10x Restart:
BALANCE CHANGES: before -> after, rationale
ISSUES / NOT VERIFIED:
NEXT: Review offline MVP and decide whether to polish visuals
```

**Thứ tự thực hiện:** P0 gameplay regression → wave/end-state → mobile layout/input → playtest/balance → README/đóng phase. Không thay đổi hành vi đã chốt trong `PHASE3_FEEDBACK_EGG_COMBAT.md`.
