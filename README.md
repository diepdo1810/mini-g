# Merge Defense MVP

Game prototype offline chứng minh vòng lặp **phòng thủ + kéo đập trứng + mở nhân vật + ghép kiểu 2048**.

Toàn bộ đồ họa hiển thị bằng hình học tối giản (Phaser 3 + TypeScript + Vite + pnpm + Vitest). Chạy 100% offline trên trình duyệt không cần server backend.

---

## 1. Cài đặt & Lệnh vận hành

Yêu cầu môi trường: **Node.js >= 18**, **pnpm**.

```bash
# Cài đặt thư viện dependencies
pnpm install

# Khởi chạy máy chủ phát triển (mặc định mở http://localhost:3000)
pnpm dev

# Kiểm tra an toàn kiểu dữ liệu TypeScript (strict mode)
pnpm typecheck

# Chạy toàn bộ 46 unit tests tự động (Vitest)
pnpm test

# Đóng gói bản build production
pnpm build

# Xem thử bản build production
pnpm preview
```

---

## 2. Luật chơi chính thức

1. **Bàn cờ & Quái:**
   - Bàn cờ 5×5 đặt ở giữa màn hình canvas dọc (chuẩn 9:16).
   - Mỗi ô chứa tối đa 1 Hero.
   - Quái xuất hiện trên đường bao hình chữ nhật kín ngoài bàn cờ và di chuyển theo chiều kim đồng hồ.
   - Quái có số hiển thị HP. Khi quái đi hết 1 vòng mà chưa bị hạ, căn cứ mất 1 Base HP (khởi đầu 3 Base HP).

2. **Hero & Kiếm xoay tự động:**
   - Khởi đầu 1 Hero loại A cấp 1 (ATK = 1, `tier = 0`) ở mép trên `(row: 0, col: 2)`.
   - Mỗi Hero có một thanh kiếm xoay tròn liên tục quanh tâm. Khi thân kiếm chạm quái, gây sát thương bằng `ATK` (có cooldown 450ms riêng theo cặp hero–quái, không trừ mỗi frame).

3. **Cơ chế Quả Trứng (Egg):**
   - Nằm ngay dưới đường chạy quái ở cạnh đáy.
   - **Tự động chém trứng:** Hero ở hàng cuối cùng `(row: 4, col: 2)` có thể dùng kiếm xoay tự động chém trúng trứng khi kiếm quay xuống dưới (cooldown 500ms).
   - **Chủ động đập trứng:** Người chơi có thể kéo từ Hero bất kỳ thả vào quả trứng để gây 1 hit sát thương bằng `ATK` (Hero vẫn giữ nguyên vị trí trên bàn cờ và vẫn tự đánh quái).
   - Sát thương lên quái và trứng được phân tách độc lập 100%, đòn đánh quái không làm hao hụt HP trứng nếu không va chạm trứng.
   - Trứng đầu tiên có 3 HP. Trứng kế tiếp tăng dần theo công thức: `3 + 2 * hatchCount` (3, 5, 7...).

4. **Nở nhân vật & Ghép kiểu 2048:**
   - Trứng về 0 HP sẽ nở sinh ra 1 Hero mới vào ô trống ngẫu nhiên:
     - Trứng đầu tiên ưu tiên nở Hero loại A tại `(row: 4, col: 2)` để người chơi trải nghiệm ngay cơ chế tự động chém trứng tiếp theo.
     - Từ trứng thứ hai trở đi, Hero nở ngẫu nhiên loại A hoặc B (tỉ lệ 50/50).
   - **Di chuyển:** Kéo Hero thả vào ô trống để đổi vị trí.
   - **Ghép (Merge):** Kéo Hero thả vào Hero khác **cùng loại và cùng cấp** để ghép:
     - `1 + 1 = 2`, `2 + 2 = 4`, `4 + 4 = 8`... (ATK nhân đôi, ô nguồn được giải phóng).
     - Khác loại (A + B) hoặc khác cấp (1 + 2) sẽ không cho phép ghép và giữ nguyên trạng thái.
   - Nếu đầy 25 ô, trứng giữ trạng thái sẵn sàng nở (`readyToHatch`) và sẽ tự động nở ngay khi có ô cờ được giải phóng qua việc ghép.

5. **Wave & Thắng / Thua:**
   - Gồm 5 Wave quái tuần tự. Khoảng cách spawn giữa các quái trong wave là 2.5 giây.
   - Khi dọn sạch quái trong wave, game nghỉ 2.0 giây rồi chuyển sang Wave kế tiếp.
   - Căn cứ mất hết HP (`Base HP <= 0`): **GAME OVER**.
   - Vượt qua toàn bộ 5 Wave và `Base HP > 0`: **VICTORY**.

---

## 3. Điều khiển

- **Chuột / Cảm ứng Touch:**
  - Nhấn giữ vào Hero và kéo: hiển thị đường nối và bóng mờ của Hero.
  - Thả vào quả trứng -> đập trứng.
  - Thả vào ô trống -> di chuyển Hero.
  - Thả vào Hero cùng loại & cùng cấp -> ghép Hero tăng sức mạnh.
- **Phím tắt nhanh (Keyboard):**
  - **Phím D / Nút DBG:** Bật/tắt hiển thị hitbox kiếm, hitbox quái và vùng chạm trứng.
  - **Phím P / Nút PAUSE:** Tạm dừng hoặc tiếp tục game (game tự động tạm dừng khi chuyển tab).
  - **Phím R / Nút RESTART:** Khởi động lại ván chơi mới từ đầu.

---

## 4. Cân bằng thông số (GameBalance.ts)

Toàn bộ thông số game được tập trung tại [src/game/config/GameBalance.ts](file:///home/diepdp/Downloads/linh_tinh/mini-g/src/game/config/GameBalance.ts):
- `SCREEN`: Kích thước logic `450×800` (tỷ lệ 9:16).
- `BOARD`: Lưới 5×5, kích thước mỗi ô 56px.
- `PATH`: Đường quái chạy cách mép bàn cờ 20px.
- `SWORD`: Chiều dài kiếm 58px, tầm quét tối đa 80px, tốc độ xoay ~1.15 vòng/giây.
- `EGG`: Tọa độ tâm `(225, 516)`, bán kính `32×36px`, cooldown chém tự động 500ms, cooldown đập kéo thả 250ms.
- `WAVES`: 5 wave với số lượng, lượng máu và tốc độ quái được cấu hình chi tiết.

---

## 5. Phạm vi MVP (Không bao gồm)
- Không dùng ảnh sprite, animation art phức tạp.
- Không kết nối server backend, cơ sở dữ liệu hoặc đồng bộ mạng.
- Không có tiền tệ, cửa hàng, tài khoản người dùng hoặc tính năng trực tuyến.
