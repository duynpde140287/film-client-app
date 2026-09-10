# StoryFlow frontend

React + TypeScript + Vite. Giao diện khách responsive, desktop NW.js và web admin cùng dùng API backend độc lập. Component chỉ thu input, gửi lệnh, hiển thị readiness/progress và preview dữ liệu. Backend quyết định quyền, license, phiên bản, trạng thái và điều kiện chạy.

## Chạy

```powershell
npm install
npm start
```

Web khách: http://127.0.0.1:5173. Backend mặc định: http://127.0.0.1:3000/api.

```powershell
npm run start:admin
```

Admin: http://127.0.0.1:5174/admin. Admin cũng có thể mở `/admin` trên web khách; quyền luôn kiểm tra tại API. Access/refresh token được giữ trong sessionStorage riêng cho giao diện khách và admin.

```powershell
npm run desktop
```

Launcher mở NW.js và tự chạy Vite nếu chưa có tại cổng 5173. Nếu `npm start` đã chạy, launcher dùng chung server. NW.js tắt Node trong renderer; logic sản xuất, credentials provider và FFmpeg đều chạy ở backend. Đây là launcher desktop phục vụ phát triển; chưa phải bộ cài phân phối có ký số hoặc tự cập nhật.

Khi đổi API, sao chép `.env.example` thành `.env`, đặt `VITE_API_URL` rồi khởi động lại frontend. Đặt origin web tương ứng trong `CORS_ORIGINS` ở backend. Web có bố cục mobile; mở trên thiết bị khác cần bind dev server và API vào địa chỉ LAN hoặc triển khai HTTPS.

## Các màn hình

- Tổng quan, tìm/lọc dự án, tạo dự án từ template đã xuất bản.
- Template Studio: chủ đề tự do, yêu cầu, phong cách, ngôn ngữ, thời lượng; xem công thức, cấu hình, 5 file con, tải file, tạo phiên bản và xuất bản.
- Dự án: kết quả 5 bước, đầu vào tùy chỉnh, chạy lại từng bước, tự động hóa và tạm dừng việc lên lịch bước tiếp theo.
- Media: preview voice/ảnh/video, trạng thái từng cảnh, tạo tất cả hoặc retry riêng asset, tải xuống.
- QC và preview/tải MP4.
- Admin: tạo khách hàng, khóa/mở, gia hạn, reset thiết bị, hỗ trợ template, health và audit.
- Kết nối dịch vụ: hiển thị đúng adapter có sẵn. Session ChatGPT, Onimivoice, Veo3 và CapCut chưa tích hợp hoàn chỉnh.

## Kiểm thử

```powershell
npm run build
npm run test:ui
```

UI test cần backend đã build tại `../backend` (hoặc biến `E2E_BACKEND_DIR`). Test chạy Edge headless trên Windows; dùng `BROWSER_CHANNEL` để đổi. Trên hệ điều hành khác, cài Chromium bằng `npx playwright install chromium`.

Test mở API riêng cổng 3102, web riêng cổng 5175 và database riêng trong `test-results/`. Tài khoản kiểm thử được tạo ngẫu nhiên và không đụng tới tài khoản demo. Kiểm tra: đăng nhập, tạo template, xem 5 file con, xuất bản, tạo dự án, chạy tự động, xem MP4, retry, mobile không tràn ngang, tạo/gia hạn/khóa khách hàng. Ảnh và báo cáo nằm trong `test-results/` (không đưa vào Git).

Chế độ demo tạo media tổng hợp để kiểm chứng workflow, không cung cấp giọng đọc hoặc hình AI thật. Cấu hình dịch vụ thật nằm ở backend.
