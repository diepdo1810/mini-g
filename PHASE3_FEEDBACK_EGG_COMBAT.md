# MERGE DEFENSE — PHASE 3 FEEDBACK: SÁT THƯƠNG & VỊ TRÍ TRỨNG

> Tài liệu bổ sung cho `docs/GAME_PLAN.md` (24/10/2026).
> Thực hiện trên project hiện tại. **Không tạo project mới.**
> Mục tiêu: Sửa bug trứng mất HP khi chỉ đánh quái; đưa trứng sát bàn cờ để kiếm của hero hàng dưới có thể chém trúng.

## 1. Quan sát từ bản chạy thử

- Bàn cờ 5×5, hero A1 có kiếm xoay, HUD và trứng đã hiển thị.
- Trứng hiện quá xa bàn cờ: kiếm hero hàng dưới không thể chạm vào trứng.
- Người chơi phản ánh **đánh quái cũng làm trứng mất HP**, dù đòn đánh không chạm trứng. Đây là bug cần tách nguồn sát thương và mục tiêu.
- Screenshot đang có 2 hero là trạng thái đã mở trứng; **trạng thái Restart vẫn phải bắt đầu đúng 1 hero**.

## 2. Thay đổi luật chơi — ưu tiên P0/P1

### P0 — Tách sát thương quái và trứng (bắt buộc)

**Bất biến:** Monster mất HP chỉ khi nhận đòn hợp lệ nhắm vào monster. Egg mất HP chỉ khi nhận đòn hợp lệ nhắm vào egg. Không có chuyện `monsterHit` mặc nhiên trừ `egg.hp`.

- Va chạm kiếm–quái: gọi `damageMonster(monsterId, heroId, damage)`.
- Va chạm kiếm–trứng: gọi `damageEgg(heroId, damage, 'orbit')` **chỉ khi hitbox kiếm giao hitbox trứng**.
- Kéo từ hero rồi thả vào trứng: gọi `damageEgg(heroId, damage, 'drag')` **một lần khi thả hợp lệ**.
- Không gọi `damageEgg` từ `onMonsterHit`, `onMonsterKilled`, wave update, kill counter hay hoạt ảnh đánh quái.
- Không dùng biến HP, damage target, cooldown hoặc collider callback chung gây lẫn đích; state nằm trong `GameEngine`.
- `egg.hp` giảm đúng `hero.atk`, chặn mức dưới 0; `monster.hp` độc lập; xử lý nở trứng đúng một lần khi HP về 0.

**Chú ý:** Nếu tại cùng thời điểm hitbox kiếm thực sự giao **cả quái lẫn trứng**, hai mục tiêu được phép nhận sát thương **độc lập**. Nhưng đánh trúng quái mà không chạm trứng thì trứng PHẢI giữ nguyên HP.

### P1 — Đưa trứng gần bàn cờ, cho kiếm tự chém trứng

**Thay đổi so với `GAME_PLAN.md` mục 4.5:** bỏ quy tắc cũ "kiếm xoay không đánh trứng". Phiên bản mới có 2 cách hợp lệ để đập trứng:

1. **Tự động:** kiếm xoay của hero gần trứng chạm hitbox trứng ⇒ trứng mất HP theo ATK, có cooldown.
2. **Chủ động:** kéo từ hero và thả vào trứng ⇒ trứng mất HP theo ATK, hero vẫn ở nguyên ô, có cooldown.

Ràng buộc:

- Trứng nằm **ngay dưới vòng di chuyển của quái ở cạnh đáy**, căn giữa theo bàn cờ. Không chồng lên đường chạy, quái hoặc HUD.
- Hero ở **hàng dưới cùng, cột giữa** phải chém được trứng bằng kiếm xoay khi không thao tác kéo.
- Hero ở hàng trên **không** được tự chém trứng xuyên bàn cờ.
- Không tăng tầm kiếm vô hạn chỉ để chạm trứng; ưu tiên **dịch trứng lên gần**. Tầm kiếm nên tiếp tục đánh được quái gần cạnh ngoài.
- Tính vị trí theo `boardBounds`, `pathBounds`, `cellSize`, `weaponReach`, kích thước hitbox trứng; không hard-code tọa độ pixel theo màn hình desktop.
- Quy tắc kiểm tra hình học: `distance(heroBottomCenter, eggHitbox) <= weaponEffectiveReach` trong ít nhất một góc quay; `eggBounds` không cắt `monsterPath` và không cắt `boardBounds`.
- Nếu thiếu chỗ ở tỉ lệ 9:16, giảm khoảng trống trang trí dưới bàn cờ / kích thước trứng trước, vẫn giữ vùng chạm trứng đủ lớn trên mobile.
- Trứng có hiệu ứng nhận đòn ngắn: nháy/đổi màu + số `-1`, `-2`...; số `EGG HP x/y` cập nhật đúng.

### P1 — Tránh double hit từ cùng một hành động

- Kiếm quay có cooldown `(heroId, eggId)`; đề xuất 500 ms, cấu hình trong `GameBalance.ts`.
- Kéo thả có cooldown theo hero; đề xuất 250 ms, giữ luật mỗi lần thả chỉ 1 hit.
- Nếu `orbit` và `drag` xảy ra **cùng simulation tick** cho cùng hero/trứng: chỉ ghi nhận **một hit**, ưu tiên drag.
- Cooldown quái `(heroId, monsterId)` **không ảnh hưởng** cooldown trứng.
- Tạo `eggId` mới mỗi lần nở; reset trạng thái cooldown phù hợp. Không nhận thêm damage lên trứng cũ sau khi nở.
- Trong Pause / Victory / Defeat: không phát sinh damage.

### P1 — Spawn đảm bảo người chơi thấy cơ chế kiếm đập trứng

- Restart: chỉ **1 hero A1** tại `(row=0, col=2)` như kế hoạch cũ.
- Trứng đầu: người chơi kéo hero xuống để mở; **nhân vật đầu nở ra là A1**, ưu tiên spawn `(row=4, col=2)` nếu trống; nếu bận chọn ô trống khác ở hàng cuối.
- Nhờ đó có thể thử ngay cơ chế kiếm tự xoay chém trứng tiếp theo.
- Các trứng tiếp theo: giữ random A/B và luật spawn hiện tại. Không tự động thêm hero ở lúc Restart.
- Giữ luật ghép `A1 + A1 => A2`, hero cùng loại + cùng ATK. Không đổi logic merge.

## 3. Gợi ý tổ chức code

Ưu tiên sửa các file hiện có. Không cần thêm thư viện vật lý / backend.

- `GameEngine.ts`: đầu mối cập nhật HP; xử lý tuần tự command và collision, không duplicate hit.
- `HitDetection.ts`: kiểm tra **kiếm–quái** và **kiếm–trứng** riêng; không lấy khoảng cách hero–trứng thay cho va chạm kiếm.
- `GameBalance.ts`: `eggOrbitHitCooldownMs`, `eggDragCooldownMs`, `eggGapBelowPath`, `weaponReach`.
- `GameScene.ts` / `EntityRenderer.ts`: vẽ vị trí trứng mới; damage feedback chỉ theo event target.
- `DragController.ts`: thả vào trứng tạo `ATTACK_EGG`; không ảnh hưởng di chuyển, ghép hoặc tự tấn công của hero.

Luồng gợi ý:

```ts
// Pseudocode: tên hàm tùy code thực tế.
for (const hero of heroes) {
  for (const monster of monsters) {
    if (swordIntersectsMonster(hero, monster) && monsterCooldownReady(hero, monster)) {
      damageMonster(monster.id, hero.id, hero.atk);
    }
  }

  if (swordIntersectsEgg(hero, egg) && eggOrbitCooldownReady(hero, egg)) {
    damageEgg(hero.id, hero.atk, 'orbit');
  }
}

// Khi thả pointer trong vùng trứng:
if (validHeroDragToEgg && eggDragCooldownReady(hero)) {
  damageEgg(hero.id, hero.atk, 'drag');
}
```

Pseudocode chỉ mô tả **phân tách mục tiêu**; thực tế dùng dedupe theo tick và event trong `GameEngine` để xử lý khi 2 nguồn damage trùng thời điểm.

## 4. Feedback UI (P2, làm sau khi P0/P1 đạt)

- Dồn phần trống lớn giữa bàn cờ và trứng; ưu tiên thao tác bằng ngón tay.
- Hiện đường đi quái và vùng tầm kiếm khi bật Debug; bình thường hiển thị tối giản.
- Tăng độ rõ của số HP trên quái, ATK trên hero và HP trên trứng.
- Khi kiếm chạm trứng: trứng rung/nháy; khi kiếm chạm quái: quái nháy. Hai loại feedback không lẫn nhau.
- Dòng `PHASE 3: ...` chỉ dùng dev/debug, ẩn khỏi UI người chơi.
- Không chỉnh đồ họa đẹp, không sprite, không đổi màu/theme lớn ở vòng sửa này.

## 5. Test bắt buộc

1. Cho quái ở tầm kiếm, trứng ngoài hitbox kiếm: **quái giảm HP, trứng giữ nguyên**.
2. Cho trứng giao kiếm, không có quái: **trứng giảm HP**, không thay đổi `kills`.
3. Cho quái và trứng đều giao kiếm: mỗi mục tiêu nhận damage theo **cooldown riêng**, không lẫn HP.
4. Quái chết: `kills +1`, không gây damage phụ lên trứng.
5. Kiếm chạm trứng liên tục: không trừ HP mỗi frame, tuân thủ cooldown.
6. Kéo hero vào trứng: đúng 1 hit/thả hợp lệ, hero giữ nguyên vị trí.
7. Kéo ra ngoài trứng: không mất HP trứng; không spawn thêm hero.
8. Orbit + drag cùng tick: không double hit cùng hero/trứng.
9. Trứng 0 HP: nở **đúng 1 hero**; không spawn lặp do hitbox còn chồng.
10. Restart: đúng **1 hero** ở `(0,2)`, trứng về HP đầu, cooldown sạch.
11. Nở trứng đầu: A1 tại `(4,2)` nếu trống; kiếm của A1 hàng cuối **tự đánh được trứng thứ 2**.
12. Màn 9:16 mobile / desktop: trứng không đè path, không mất vùng chạm, không cắt khỏi canvas.
13. Pause / kết thúc ván: HP quái và trứng không thay đổi.
14. Di chuyển / ghép hero vẫn hoạt động như trước.

## 6. Thứ tự làm & bàn giao

1. **P0:** tái hiện bug trừ HP trứng khi đánh quái; viết test fail; sửa; test pass.
2. **P1:** chỉnh layout trứng gần bàn, thêm sword–egg collision + cooldown; test pass.
3. **P1:** test first-hatch spawn hàng dưới, drag và merge không hồi quy.
4. **P2:** bổ sung feedback hình học tối giản.
5. Chạy `pnpm typecheck`, `pnpm test`, `pnpm build`; báo kết quả thực tế.

Báo cáo sau khi triển khai: file đã sửa, nguyên nhân gốc bug, hành vi trước/sau, kết quả test, screenshot 9:16 thể hiện hero hàng dưới chém trứng. **Không triển khai online hay tính năng mới ngoài phạm vi.**

## 7. Prompt gọi Antigravity

> Đọc `docs/GAME_PLAN.md` và `docs/PHASE3_FEEDBACK_EGG_COMBAT.md`.
> Sửa trực tiếp project hiện tại theo file feedback; file feedback được ưu tiên ở các chỗ xung đột với GAME_PLAN.md.
> Làm P0 trước, sau đó P1, cuối cùng P2. Viết test cho bug và kiểm tra va chạm thực.
> Không tạo lại project, không thêm backend/sprite. Chạy typecheck, test, build rồi báo kết quả.
