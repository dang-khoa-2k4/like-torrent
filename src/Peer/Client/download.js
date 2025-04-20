const Buffer = require("buffer").Buffer;
const tracker = require("./tracker");
const timerControl = require('./timerControl');
const {
  genID,
  genPort,
  getIntervalForGetListPeer,
  setStatus,
  setTimerForGetListPeer,
  getTimerForGetListPeer,
  updateDownloaded,
} = require("./util");
const message = require("../util/message");
const {
  inforHash,
  blockLen,
  blocksPerPiece,
  size,
} = require("./torrentParser");
const {
  updateNumPeerConnected,
  updateNumPeerDownloading,
  updateCountDownloading,
  removeCountDownloading,
  getTimer,
  updateProgressList,
} = require("./properties");
const readline = require("readline");

const maximumPeerNeed = 10;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let connectedPeer = {};

const { Worker } = require("worker_threads");

const os = require("os");
const { get } = require("http");
const { exit } = require("process");
const { clear } = require("console");

const MAX_WORKERS = os.cpus().length; // Giới hạn số lượng Worker song song


module.exports = async (
  torrent,
  sharedPieceBuffer,
  sharedReceivedBuffer,
  sharedRequestedBuffer,
  sharedFreqBuffer,
  fileInfoList,
  state
) => {
  if (!connectedPeer[inforHash(torrent)]) {
    connectedPeer[inforHash(torrent)] = [];
  }

  setStatus(torrent, "started");
  let download = (peers) => {
    const workerQueue = [...peers]; // Hàng đợi peer

    function runNextWorker() {
      if (workerQueue.length === 0) return;

      const peer = workerQueue.shift();
      if (
        connectedPeer[inforHash(torrent)].find(
          (obj) => obj.port === peer.port
        ) ||
        peer.port == genPort(inforHash(torrent))
      ) {
        runNextWorker();
        return;
      }
      const worker = new Worker("./Client/downloadWorker.js", {
        workerData: {
          torrent,
          sharedReceivedBuffer,
          sharedRequestedBuffer,
          sharedFreqBuffer,
          sharedPieceBuffer,
          fileInfoList,
          // connectedPeer,
          peer,
          yourID: genID(torrent),
          inforHash: inforHash(torrent).toString("hex"),
          serverPort: genPort(inforHash(torrent)),
        },
      });
      console.log(`Running worker for peer: ${peer.port}`);

      worker.on("message", async (msg) => {
        if (msg.type == "have") {
          state[inforHash(torrent)].forEach((st) => {
            st.connection.write(message.buildHave(msg.payload.index));
          });
        } else if (msg.type == "done") {
          setStatus(torrent, "completed");
          console.log(
            "Download completed in",
            (new Date().getTime() - getTimer(torrent).getTime()),
            "ms"
          );
          console.log("Download speed: ", 
            (torrent.info.length / (2 ** 10)) / (new Date().getTime() - getTimer(torrent).getTime()), 
            "MB/s");

          timerControl.stopPeerListTimer(torrent);

          removeCountDownloading(torrent);

          connectedPeer[inforHash(torrent)].forEach((peer) => {
            peer.worker.terminate();
          });

          await delay(100);

          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });


          rl.question(
            "Bạn có muốn tiếp tục chia sẻ file này không? (Y/N): ",
            (answer) => {
              rl.close();
              if (answer.toLowerCase() === "y") {
                console.log("Tiếp tục chia sẻ file...");
                tracker.getPeers(torrent, () => {});
                timerControl.startPeerListTimer(torrent);
              } else {
                console.log("Dừng chia sẻ file");
                exit(0);
              }
            }
          );


        } else if (msg.type == "downloaded") {
          const PeerUpload = state[inforHash(torrent)].find((st) => {
            return (
              Buffer.compare(st.peerId, Buffer.from(msg.peer.peer_id.data)) == 0
            );
          });
          if (PeerUpload) {
            PeerUpload.uploaded += msg.payload.block.length;
          }
          updateDownloaded(torrent, msg.payload.block.length);
          updateProgressList(torrent, msg.payload, fileInfoList);
        } else if (msg.type == "peerDisconnect") {
          // console.log(connectedPeer[inforHash(torrent)]);
          connectedPeer[inforHash(torrent)] = connectedPeer[
            inforHash(torrent)
          ].filter((peer) => {
            return peer.port != msg.peer.port;
          });
          console.log("disconnect from peer: ", msg.peer.port);
          updateNumPeerConnected(
            torrent,
            connectedPeer[inforHash(torrent)].length
          );
        }
        if (msg.type == "received") {
          connectedPeer[inforHash(torrent)].forEach((peer) => {
            if (peer.port == msg.port) {
              peer.uploaded = true;
            }
          });

          // console.log(connectedPeer[inforHash(torrent)]);
        }
        // console.log(`Worker completed for peer: ${message.peer.ip}:${message.peer.port}`);
        // console.log(`sharedReceived after worker:`,sharedReceived);
        runNextWorker(); // Tiếp tục worker kế tiếp
      });

      worker.on("error", (err) => {
        // console.error(`Worker error:`, err);
        runNextWorker();
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          console.error(`Worker exited with code ${code}`);
        }
      });

      if (peer.port != genPort(inforHash(torrent))) {
        connectedPeer[inforHash(torrent)].push({
          ...peer,
          uploaded: false,
          worker: worker,
        });
      }
    }

    runNextWorker();
  };

  timerControl.setupReferences(download, connectedPeer);

  tracker.getPeers(torrent, (peers) => {
    download(peers);
  });

  updateNumPeerConnected(torrent, connectedPeer[inforHash(torrent)].length);
  // Các hàm xử lý thời gian tương tự như ban đầu
  setStatus(torrent, "downloading");

  timerControl.startPeerListTimer(torrent, maximumPeerNeed);

  countSourceTimer = setInterval(() => {
    let count = 0;

    connectedPeer[inforHash(torrent)].forEach((peer) => {
      if (peer.uploaded) {
        count++;
        peer.uploaded = false;
      }
    });
    updateNumPeerDownloading(torrent, count);
  }, 50);

  updateCountDownloading(torrent, countSourceTimer);
};


