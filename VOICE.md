# Hướng dẫn giọng nói (Plan A — Web Speech API)

**Spec chi tiết shop (alias, câu lệnh, bảng test):** [`Voice_check.md`](Voice_check.md)

## Tổng quan

- **Miễn phí**, không API key, chạy trên GitHub Pages + Firebase như hiện tại.
- File: `js/voice-assistant.js` — nút mic trên topbar.
- Luồng: **Mic → Web Speech (vi-VN) → parse lệnh → ghi Firebase** (qua `saveCarListToFirebase`).

## Yêu cầu khi test

1. Mở site bằng **HTTPS** (GitHub Pages đủ).
2. Trình duyệt: **Chrome Android** hoặc **Edge** (ổn nhất). Safari iOS hỗ trợ kém.
3. Cho phép **quyền micro** khi trình duyệt hỏi.
4. Nói **ngắn, rõ** trong môi trường ít ồn.

## Lệnh hỗ trợ (ví dụ)

| Nói | Việc làm |
|-----|----------|
| `cho xe 12 ra` / `thêm xe 12` | Thêm xe 12 ra danh sách (`addCar`) |
| `12 vào` / `xe 12 vào` | Bấm **Vào** (tạm dừng đếm) |
| `12 res` / `12 tiếp tục` | Bấm **Res** |
| `đổi 12 sang 15` | Đổi mã xe 12 → 15 |
| `12 thanh toán` / `12 r` | Trạng thái **R** (đã trả) |
| `12 chưa trả` / `12 c` | Trạng thái **C** |
| `xóa 12` | Xóa dòng (có hộp xác nhận) |

Nếu **nhiều dòng cùng mã**, app chọn dòng **mới nhất** (id lớn nhất).

## Cấu trúc code

```
index.html          → nút #voiceMicBtn, panel #voiceStatusPanel
js/voice-assistant.js
  parseVoiceCommand()   → { action, carCodes }
  executeIntent()       → gọi addCar / toggle Vào·Res / đổi xe / C·R
```

## Mở rộng sau (Plan B)

Khi cần nhận diện tốt hơn: thêm Firebase Function + Groq Whisper, giữ `parseVoiceCommand` và `executeIntent` như cũ, chỉ đổi bước STT.

## Nghe dở — làm gì?

1. **Giữ mic** (không bấm chớp) → nói xong mới thả tay.
2. **Sửa chữ** trong ô xanh rồi bấm **Chạy** (không tự chạy nữa).
3. **Bật Whisper** (nghe tốt hơn nhiều, vẫn free):

```html
<!-- Thêm TRƯỚC <script src="js/voice-assistant.js"> -->
<script>
  window.VOICE_STT_CONFIG = {
    mode: 'whisper',
    whisperProxyUrl: 'https://YOUR-SUBDOMAIN.workers.dev'
  };
</script>
```

Deploy proxy: thư mục `stt-proxy/` → Groq API key → Cloudflare Workers (xem `stt-proxy/worker.js`).

## Gỡ lỗi

| Triệu chứng | Cách xử lý |
|-------------|------------|
| Nghe sai liên tục | Bật Whisper; hoặc sửa chữ + Chạy |
| Nút mic mờ | Cần Chrome + HTTPS; hoặc cấu hình Whisper proxy |
| `not-allowed` | Cấp quyền mic trong cài đặt site |
| Whisper lỗi | Kiểm tra `GROQ_API_KEY` trên Worker |
| Không ghi Firebase | Kiểm tra mạng + rules Firebase |
