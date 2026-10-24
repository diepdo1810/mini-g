# Merge Defense MVP

Game prototype offline chứng minh vòng lặp **phòng thủ + kéo đập trứng + mở nhân vật + ghép kiểu 2048**.

Đồ họa hoàn toàn bằng hình học (Phaser 3 + TypeScript + Vite + pnpm). Chạy 100% offline trên trình duyệt.

## Cài đặt & Chạy

Yêu cầu: Node.js >= 18, pnpm.

```bash
# Cài đặt dependencies
pnpm install

# Chạy server dev (mở http://localhost:3000)
pnpm dev

# Kiểm tra kiểu dữ liệu TypeScript
pnpm typecheck

# Chạy unit tests (Vitest)
pnpm test

# Build production
pnpm build
```

## Điều khiển (Phase 0 & 1)
- **Tự động**: Hero ATK 1 đặt ở `(row: 0, col: 2)` tự động xoay kiếm và tấn công quái di chuyển trên đường bao quanh bàn cờ.
- **Phím D / Nút DBG**: Bật/tắt hiển thị hitbox kiếm và tầm quét quái.
- **Phím P / Nút PAUSE**: Tạm dừng hoặc tiếp tục game.
- **Phím R / Nút RESTART**: Chơi lại từ đầu.

