# ECarbyMital (Mital Manage)

Ứng dụng web (HTML/CSS/JS thuần) để **quản lý xe điện cho thuê** theo dạng danh sách + đếm ngược thời gian, có **đồng bộ realtime** qua **Firebase Realtime Database**. Dự án cũng kèm một trang phụ **Vòng quay may mắn** (`spin.html`) dùng Firebase để đồng bộ danh sách option và xác suất.

- **Demo (GitHub Pages)**: `https://mitalnmt.github.io/ECarControl/`

## Tính năng chính

### Quản lý xe cho thuê (`index.html`)

- **Thêm xe nhanh** bằng “Chọn Xe” (menu theo nhóm mã xe).
- **Đếm ngược thời gian** cho từng xe (mặc định \(15\) phút + \(0\) giây; chỉnh được).
- **Cảnh báo xe hết giờ**:
  - Tô màu/nhấp nháy dòng.
  - Toast tổng hợp các xe đã hết giờ.
  - Âm báo + rung (nếu thiết bị hỗ trợ).
  - Thông báo hệ điều hành (nếu cấp quyền Notification).
- **Trạng thái thanh toán**: nút `C/R` (chưa/đã thanh toán).
- **Đánh dấu xe “Vào/Res”** (tạm dừng/tiếp tục đếm ngược).
- **Chỉnh thời gian** từng xe (±1, ±5 phút, hoặc ±“1x” theo bước cấu hình).
- **“Đi nhiêu tính nhiêu” (Null time)**: không đếm ngược, hiển thị thời gian đã trôi qua.
- **Ghi chú** cho từng xe hoặc áp dụng ghi chú cho nhiều xe.
- **Chọn nhiều dòng** để:
  - Xóa nhiều dòng
  - Chỉnh thời gian hàng loạt
  - Ghi chú hàng loạt
  - **Gộp xe thành nhóm / tách nhóm** (tô màu theo nhóm)
- **Undo**: quay lại thao tác trước (nút Back hoặc `Ctrl+Z`).
- **Xuất danh sách** ra file `.txt`.
- **Toàn màn hình** (fullscreen).
- **Xóa tất cả** (bảo vệ bằng cơ chế xác nhận 5 lần).
- **Đồng bộ dữ liệu**: car list và cấu hình menu xe được lưu lên Firebase để nhiều thiết bị cùng xem/cập nhật.

### Vòng quay may mắn (`spin.html`)

- Nhập danh sách option (mỗi dòng 1 option), vòng quay **chia đều** theo số option.
- **Xác suất** nằm ở phần cài đặt: mỗi option có “weight %” (tổng phải ~100%).
- **Forced result**: chọn trước kết quả 1 lần (lưu lên Firebase để thiết bị khác có thể “cài” cho thiết bị đang quay).
- **Realtime sync**: thay đổi cài đặt/options trên một thiết bị sẽ cập nhật sang thiết bị khác.

## Cấu trúc dự án

```text
.
├─ index.html                 # App quản lý xe (UI + Firebase init)
├─ script.js                  # Logic chính: carList, countdown, multi-select, toast, settings...
├─ style.css                  # CSS bổ sung (trạng thái dòng, selection bar, editor UI...)
├─ car-menu-editor.js         # Editor kéo-thả để chỉnh nhóm/mã xe (sync Firebase + localStorage)
├─ multiple-car-selection.js  # UI chọn nhiều xe trong modal + thêm xe theo nhóm
├─ spin.html                  # Trang vòng quay may mắn (Firebase + canvas)
└─ simple-test.html           # Trang test đơn giản (debug)
```

## Yêu cầu

- **Trình duyệt hiện đại** (Chrome/Edge/Safari/Firefox).
- Nếu muốn đồng bộ realtime: cần truy cập được **Firebase Realtime Database** theo cấu hình trong `index.html` và `spin.html`.

## Cách chạy dự án (local)

Dự án là static site, không cần build.

### Cách 1: Mở trực tiếp file

- Mở `index.html` bằng trình duyệt.

Lưu ý: tuỳ chính sách trình duyệt, một số tính năng có thể ổn định hơn khi chạy qua local server (đặc biệt nếu sau này thêm tài nguyên/route).

### Cách 2: Chạy bằng local server (khuyến nghị)

Ví dụ với Python:

```bash
python -m http.server 8080
```

Sau đó mở `http://localhost:8080/index.html`.

## Hướng dẫn sử dụng nhanh

### Thêm xe

- Bấm **Chọn Xe** (bottom bar) → chọn mã xe trong modal.
- Hoặc bấm **Chọn Xe** → sang modal **Chọn Nhiều Xe** để chọn nhiều mã rồi:
  - **Gộp thành nhóm** (các xe đi chung, tô màu theo nhóm)
  - **Thêm riêng lẻ**

### Các cột trong bảng

- **in4**: trạng thái thanh toán `C/R` và ghi chú (nếu có).
- **Mã xe**: bấm để đổi mã (lưu lại danh sách mã cũ).
- **Time**: hiển thị giờ ra/giờ vào.
- **Còn lại**: đếm ngược (hoặc đếm lên với “Null time”).
- **Action**:
  - `Vào`/`Res` (toggle done/resume)
  - `...` mở modal thao tác (Time/Xóa/Ghi chú/Di chuyển lên-xuống)

### Chọn nhiều dòng (multi-select dòng)

- Bấm **Select** (bottom bar) để bật chế độ chọn.
- Chạm/click vào dòng để chọn.
- Dùng thanh tác vụ nổi để: **Bỏ chọn / Chọn tất cả / Gộp / Tách nhóm / Chỉnh thời gian / Ghi chú / Xóa**.

### Undo

- Trong **Cài đặt** bấm nút **← Back** hoặc nhấn `Ctrl+Z`.

## Cấu hình

### Thời gian mặc định & bước ±1x

Trong **Cài đặt**:
- **Phút/Giây mặc định** cho mỗi xe mới.
- **Bước -1x/+1x** (phút) dùng cho chỉnh thời gian nhanh.

Các giá trị được lưu ở `localStorage`.

### Menu xe (Car Menu Editor)

Trong **Cài đặt** → **Mở Editor**:
- Chỉnh **nhóm xe**, **thứ tự nút**, **màu nhóm**, **thêm/xóa/sửa** mã xe.
- Kéo thả để sắp xếp; kéo vào **Thùng rác** để xóa.
- Có nút **Reset về mặc định**.

Dữ liệu menu được lưu:
- `localStorage` (key: `carMenuConfig`)
- Firebase DB path: `carMenuConfig`

### Firebase

Firebase config đang được hardcode trực tiếp trong:
- `index.html` (car list + car menu config)
- `spin.html` (lucky wheel)

DB paths đang dùng:
- **Car list**: `carList`
- **Car menu config**: `carMenuConfig`
- **Lucky wheel**: `luckyWheel` (options + weights + forcedResult)

## Troubleshooting

- **Không đồng bộ giữa các thiết bị**:
  - Kiểm tra mạng, và quyền đọc/ghi của Realtime Database (rules).
  - Mở DevTools Console để xem lỗi Firebase.
- **Không có Notification**:
  - Bấm **Bật thông báo** để xin quyền.
  - Trên iOS/Safari có thể bị giới hạn theo hệ điều hành.
- **Xe bị “xám” trong menu chọn xe**:
  - Đó là xe đang ở trạng thái “đang ra” (chưa `Vào`), hệ thống khóa để tránh chọn trùng.

## Ghi chú bảo mật

- Firebase `apiKey` trong web app **không phải bí mật**; bảo mật nằm ở **Firebase Realtime Database Rules**. Nếu triển khai cho môi trường thật, hãy cấu hình rules chặt chẽ theo nhu cầu.
