# LIKE-TORRENT - BitTorrent Client

<p align="center"> <img src="https://img.icons8.com/color/96/000000/torrent.png" alt="Like-Torrent Logo"/> </p>

## Giới thiệu
LIKE-TORRENT là một ứng dụng mô phỏng cơ chế hoạt động của BitTorrent, được phát triển như một dự án môn học Mạng Máy Tính. Ứng dụng cho phép chia sẻ và tải xuống các tập tin thông qua mạng ngang hàng (P2P) với cơ chế phân tán hiệu quả.

## Đặc điểm chính
- **Giao thức P2P:** Trao đổi dữ liệu trực tiếp giữa các peer
- **Phân mảnh file:** Chia file thành nhiều mảnh nhỏ để tải từ nhiều nguồn
- **Đa luồng:** Sử dụng Worker Threads để tối ưu hiệu suất tải xuống
- **Cơ chế rarest-first:** Ưu tiên tải các phần hiếm trong mạng
- **Hỗ trợ seeding:** Chia sẻ lại file sau khi tải xong

## Yêu cầu hệ thống
- Node.js (v12.0 trở lên)
- Windows (đã được kiểm thử đầy đủ)
- Linux/MacOS (cần chỉnh sửa file `run.bat`)

## Cài đặt
1. Clone repository:
```bash
git clone <repository-url>
cd like-torrent
```
2. Cài đặt các gói phụ thuộc:
```bash
npm install
```

## Cách sử dụng

### Sử dụng file batch (Windows)
Chạy file `run.bat`:

Chọn một trong các tùy chọn:
- Chạy máy chủ (seeder) - Chia sẻ file
- Chạy máy khách (downloader) - Tải xuống file
- Chạy tracker server - Quản lý kết nối
- Thoát

### Sử dụng trực tiếp qua dòng lệnh
- Chạy tracker server:
```bash
node tracker.js
```
- Chạy seeder:
```bash
node seeder.js <file_path>
```
- Chạy downloader:
```bash
node downloader.js <torrent_file>
```

## Cấu trúc dự án

```
like-torrent/
├── tracker.js
├── seeder.js
├── downloader.js
├── run.bat
├── package.json
└── README.md
```

## Cách hoạt động

### Quá trình tải xuống file:
1. **Khởi động Tracker:** Tracker server quản lý và kết nối các peer
2. **Seeder khởi động:** Seeder chia sẻ file đã có với mạng
3. **Downloader khởi động:**
   - Kết nối tới Tracker để lấy danh sách peer
   - Tạo các worker thread để tải song song
   - Tải các phần của file từ nhiều peer khác nhau
   - Khi hoàn thành, có thể trở thành seeder

### Cơ chế worker threads:
- Mỗi worker quản lý kết nối tới một peer
- Trao đổi các thông điệp (`have`, `request`, `piece`, etc.) theo giao thức BitTorrent
- Sử dụng `SharedArrayBuffer` để đồng bộ dữ liệu giữa các worker

### Xử lý lỗi
- Tự động thử lại khi kết nối thất bại
- Giới hạn số lượng worker đồng thời chạy
- Xử lý khi peer ngắt kết nối đột ngột
- Kiểm tra tính toàn vẹn dữ liệu

## Phát triển
Để mở rộng dự án, bạn có thể:
- Thêm giao diện người dùng đồ họa
- Hỗ trợ tính năng mã hóa kết nối
- Tối ưu thuật toán chọn `piece` để tải
- Cải thiện khả năng phục hồi khi mạng kém ổn định

## Tác giả
Nhóm sinh viên - Môn Mạng Máy Tính - Đại học XYZ

> **Lưu ý:** Dự án này được tạo cho mục đích học tập và nghiên cứu. Không khuyến khích sử dụng cho mục đích phi pháp hoặc vi phạm bản quyền.

