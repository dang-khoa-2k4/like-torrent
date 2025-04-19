@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: Thiết lập đường dẫn - Sử dụng dấu ngoặc kép cho các đường dẫn có dấu cách
set "PROJECT_DIR=%~dp0"
set "SCRIPT_PATH=%PROJECT_DIR%src\Peer"
set "TRACKER_PATH=%PROJECT_DIR%src\Tracker\server.js"

:: In tiêu đề
echo ==================================================
echo           LIKE-TORRENT - BTL1
echo ==================================================
echo.

:: Kiểm tra nếu Node.js được cài đặt
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Lỗi: Node.js không được tìm thấy! Vui lòng cài đặt Node.js.
    echo Tải Node.js tại: https://nodejs.org/
    goto :eof
)

:: Menu chọn chức năng
:menu
echo Chọn chế độ hoạt động:
echo 1. Chạy máy chủ (seeder) - Chia sẻ file
echo 2. Chạy máy khách (downloader) - Tải file
echo 3. Chạy tracker server - Quản lý kết nối
echo 4. Thoát
echo.

set /p choice=Nhập lựa chọn của bạn (1-4): 

if "%choice%"=="1" (
    call :run_seeder
) else if "%choice%"=="2" (
    call :run_downloader
) else if "%choice%"=="3" (
    call :run_tracker
) else if "%choice%"=="4" (
    goto :eof
) else (
    echo Lựa chọn không hợp lệ, vui lòng thử lại!
    echo.
    goto menu
)

goto menu

:: Run tracker server
:run_tracker
echo Đang khởi động máy chủ tracker...
:: Sửa lại phần này để chạy tracker trong cửa sổ mới và xử lý đường dẫn có dấu cách
start cmd /k "cd /d "%PROJECT_DIR%" && node "%TRACKER_PATH%""
echo Máy chủ tracker đã được khởi động! (Xem cửa sổ terminal mới)
echo.
goto :eof

:: Hàm chạy chế độ Seeder
:run_seeder
echo.
echo Đang khởi động máy chủ (Seeder)...
echo.
:: Thêm /d để hỗ trợ thay đổi ổ đĩa và sử dụng dấu ngoặc kép phù hợp
start cmd /k "cd /d "%SCRIPT_PATH%" && node index.js seeder"
@REM echo cd /d "%SCRIPT_PATH%" 
@REM echo node index.js seeder
echo Máy chủ đã được khởi động! (Xem cửa sổ terminal mới)
echo.
goto :eof

:: Hàm chạy chế độ Downloader
:run_downloader
echo.
set /p "client_id=Nhập ID máy khách: "
@REM echo cd /d "%SCRIPT_PATH%" 
@REM echo node index.js download "%client_id%"
start cmd /k "cd /d "%SCRIPT_PATH%" && node index.js download %client_id%"
echo Máy khách đã được khởi động! (Xem cửa sổ terminal mới)
echo.
goto :eof

endlocal