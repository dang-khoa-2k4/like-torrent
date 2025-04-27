const { getIntervalForGetListPeer, setTimerForGetListPeer, getTimerForGetListPeer } = require("./util");
const { inforHash } = require("./TorrentParser");
const { updateNumPeerConnected } = require("./Properties");
const tracker = require("./Tracker");

// Lưu trữ tham chiếu đến hàm download
let downloadCallback = null;
let connectedPeerRef = null;

// Thiết lập tham chiếu
function setupReferences(download, connectedPeer) {
  downloadCallback = download;
  connectedPeerRef = connectedPeer;
}

function startPeerListTimer(torrent, maxPeerNeed) {
  // Dừng timer hiện tại nếu có
  
  console.log("Bắt đầu timer cập nhật danh sách peer");
  
  let timerID = setInterval(() => {
    console.log("Đang cập nhật danh sách peer...");
    let callback = downloadCallback;

    // Kiểm tra số lượng peer hiện tại
    if (connectedPeerRef[inforHash(torrent)].length >= maxPeerNeed) {
      callback = () => {}; // Không cần thêm peer nữa
    }
    
    tracker.getPeers(torrent, callback);
    updateNumPeerConnected(torrent, connectedPeerRef[inforHash(torrent)].length);
  }, getIntervalForGetListPeer(torrent));

  setTimerForGetListPeer(torrent, timerID);
  return timerID;
}

function stopPeerListTimer(torrent) {
  console.log("Dừng timer cập nhật danh sách peer");
  const timerID = getTimerForGetListPeer(torrent);
  if (timerID) {
    clearInterval(timerID);
    return true;
  }
  return false;
}

module.exports = {
  setupReferences,
  startPeerListTimer,
  stopPeerListTimer
};