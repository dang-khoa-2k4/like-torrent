#!/bin/bash
# filepath: d:\university\Junior\Computer Networking\BTL1\like-torrent\run.sh

# Set UTF-8 for proper display of Vietnamese characters
export LANG=en_US.UTF-8

# Setup paths - use absolute path to avoid issues
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PEER_PATH="${SCRIPT_DIR}/src/Peer"
TRACKER_PATH="${SCRIPT_DIR}/src/Tracker/server.js"

# Print header
echo "=================================================="
echo "           LIKE-TORRENT - BTL1"
echo "=================================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Lỗi: Node.js không được tìm thấy! Vui lòng cài đặt Node.js."
    echo "Tải Node.js tại: https://nodejs.org/"
    exit 1
fi

# Function to run tracker server
run_tracker() {
    echo "Đang khởi động máy chủ tracker..."
    gnome-terminal -- bash -c "cd \"${SCRIPT_DIR}\" && node \"${TRACKER_PATH}\"; exec bash" || \
    xterm -e "cd \"${SCRIPT_DIR}\" && node \"${TRACKER_PATH}\"; exec bash" || \
    konsole -e "cd \"${SCRIPT_DIR}\" && node \"${TRACKER_PATH}\"; exec bash" || \
    x-terminal-emulator -e "cd \"${SCRIPT_DIR}\" && node \"${TRACKER_PATH}\"; exec bash" || \
    cd "${SCRIPT_DIR}" && node "${TRACKER_PATH}" &
    echo "Máy chủ tracker đã được khởi động! (Xem cửa sổ terminal mới hoặc chạy nền)"
    echo ""
}

# Function to run seeder
run_seeder() {
    echo ""
    echo "Đang khởi động máy chủ (Seeder)..."
    echo ""
    gnome-terminal -- bash -c "cd \"${PEER_PATH}\" && node index.js seeder; exec bash" || \
    xterm -e "cd \"${PEER_PATH}\" && node index.js seeder; exec bash" || \
    konsole -e "cd \"${PEER_PATH}\" && node index.js seeder; exec bash" || \
    x-terminal-emulator -e "cd \"${PEER_PATH}\" && node index.js seeder; exec bash" || \
    cd "${PEER_PATH}" && node index.js seeder &
    echo "Máy chủ đã được khởi động! (Xem cửa sổ terminal mới hoặc chạy nền)"
    echo ""
}

# Function to run downloader
run_downloader() {
    echo ""
    read -p "Nhập ID máy khách (để trống nếu không cần): " client_id
    
    if [ -z "$client_id" ]; then
        echo "Đang khởi động máy khách (không có ID)..."
        gnome-terminal -- bash -c "cd \"${PEER_PATH}\" && node index.js download; exec bash" || \
        xterm -e "cd \"${PEER_PATH}\" && node index.js download; exec bash" || \
        konsole -e "cd \"${PEER_PATH}\" && node index.js download; exec bash" || \
        x-terminal-emulator -e "cd \"${PEER_PATH}\" && node index.js download; exec bash" || \
        cd "${PEER_PATH}" && node index.js download &
    else
        echo "Đang khởi động máy khách với ID: $client_id..."
        gnome-terminal -- bash -c "cd \"${PEER_PATH}\" && node index.js download \"$client_id\"; exec bash" || \
        xterm -e "cd \"${PEER_PATH}\" && node index.js download \"$client_id\"; exec bash" || \
        konsole -e "cd \"${PEER_PATH}\" && node index.js download \"$client_id\"; exec bash" || \
        x-terminal-emulator -e "cd \"${PEER_PATH}\" && node index.js download \"$client_id\"; exec bash" || \
        cd "${PEER_PATH}" && node index.js download "$client_id" &
    fi
    
    echo "Máy khách đã được khởi động! (Xem cửa sổ terminal mới hoặc chạy nền)"
    echo ""
}

# Main menu loop
while true; do
    echo "Chọn chế độ hoạt động:"
    echo "1. Chạy máy chủ (seeder) - Chia sẻ file"
    echo "2. Chạy máy khách (downloader) - Tải file"
    echo "3. Chạy tracker server - Quản lý kết nối"
    echo "4. Thoát"
    echo ""
    
    read -p "Nhập lựa chọn của bạn (1-4): " choice
    
    case $choice in
        1)
            run_seeder
            ;;
        2)
            run_downloader
            ;;
        3)
            run_tracker
            ;;
        4)
            echo "Đang thoát chương trình..."
            exit 0
            ;;
        *)
            echo "Lựa chọn không hợp lệ, vui lòng thử lại!"
            echo ""
            ;;
    esac
done