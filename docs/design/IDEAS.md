# Mini-G — Idea Bank / Quyết định hình ảnh

> **Concept trước; code sau.** Không kéo thêm nhiệm vụ vào sprint gameplay đang xử lý #25.

## Đã chốt

- Game: thủ thành + board merge kiểu 2048 + trứng Hero, màn hình dọc 9:16.
- Chủ đề Hero: **ấu trùng rất dễ thương**, tròn mềm, biểu cảm vui; khi ghép sẽ dần hóa thành **quái vật chibi**, không chỉ tăng ATK.
- Visual: casual 2D, màu dịu mà tươi, dễ đọc trên Android. **Không sao chép nhân vật Larva**; dùng tạo hình độc lập.
- Combat: mỗi family vẫn theo cơ chế kiếm/vật thể xoay, khác chủ đề hiệu ứng vũ khí, màu, độ dài/tốc độ sau khi cân bằng được chốt.
- Map: tập trung **1 map Spring** thật đẹp trước, tối đa 3 map/biến thể trong giai đoạn đầu.
- 5×5 là baseline; nếu gameplay quá chật thì mở issue riêng để test 6×6, không đổi lúc art đang làm.

## Định hướng — CHƯA CHỐT

- 2 family art đầu: Mầm Lá (xanh), Hỏa Trùng (cam), 4 form mỗi family (T1 → T4). Điện Trùng để backlog.
- Mỗi lần merge đổi tai/sừng/mắt/tail/silhouette; T4 trở thành sinh vật chibi khác biệt.
- Hình ảnh biến hình: sprite swap + squash/stretch + particle nhẹ; chưa cần animation phức tạp.
- 1 map nền xuân; Thu/Đông làm palette variants ở giai đoạn tiếp, không code 3 map cùng lúc.
- Quái từ điểm A → B là **ý tưởng thay đường chạy hiện tại**, chưa chốt đường đi. Cần test tác động đến thời gian/combat/khó.
- Bộ sưu tập Hero (Codex) và hero skill chủ động là **future backlog**.

## Phải duyệt trước khi code giao diện

1. Hero: mẫu sheet Mầm Lá T1–T4 ở kích thước thật trong game.
2. Map: Spring với đường quái/board rõ, không nhiễu.
3. Battle HUD: vị trí Wave, HP, queue, trứng; ưu tiên thao tác chạm.
4. Sau khi chốt mới ghi issue code cho Antigravity. Không tự triển khai thiết kế phỏng đoán.

Nguồn tham chiếu: [#26 Hero](https://github.com/diepdo1810/mini-g/issues/26), [#27 Map](https://github.com/diepdo1810/mini-g/issues/27), [#28 UI](https://github.com/diepdo1810/mini-g/issues/28).
