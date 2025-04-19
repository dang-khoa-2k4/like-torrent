const tracker = require("./Client/tracker");
const torrentParser = require("./Client/torrentParser");
const download = require("./Client/download");
const { server, state } = require("./Server/server");
const {
  genPort,
  getIntervalForGetListPeer,
  setStatus,
  getStatus,
  updateDownloaded,
  getDownloaded,
} = require("./Client/util");
const path = require("path");
const { processFiles } = require("./Client/readAndWritePieces");
const { selectFiles } = require("./Client/chooseFile");

const { createProgressList, setTimer } = require("./Client/properties");

const args = process.argv.slice(2);
// const torrentPath = 'bluemew.torrent';
const torrentPath = "QLDA.mp4.torrent";
// const torrentPath = 'video.mkv.torrent';
// const torrentPath = 'drive-download-20241105T125636Z-001.torrent';
// const torrentPath = 'raw_chap2,3-20241102T142328Z-001.torrent';
// const torrentPath = 'Pic4rpCa.torrent';
const torrent = torrentParser.open(torrentPath);

const basePath = path.dirname(torrentPath);

let clientID = "";
if (args[0] == "download") {
  clientID = args[1];
}

const fileInfoList = torrentParser.getFileInfo(
  torrent,
  basePath,
  `received${clientID}/`
);

let isSeeder = false;

if (args[0] == "seeder") {
  isSeeder = true;
}
tracker.scrape(torrent);

async function processFile() {
  try {
    const [
      pieces,
      sharedPieceBuffer,
      sharedReceivedBuffer,
      sharedRequestedBuffer,
      sharedFreqBuffer,
    ] = await processFiles(fileInfoList, torrent);

    // console.log('pieces:', pieces);
    const peerServer = server(
      genPort(torrentParser.inforHash(torrent)),
      torrent,
      pieces,
      sharedPieceBuffer
    );

    if (args[0] == "download") {
      (async () => {
        await selectFiles(fileInfoList);

        createProgressList(torrent, fileInfoList);

        setTimer(torrent, new Date());
        download(
          torrent,
          sharedPieceBuffer,
          sharedReceivedBuffer,
          sharedRequestedBuffer,
          sharedFreqBuffer,
          fileInfoList,
          state
        );
      })();
    }
    if (args[0] == "seeder") {
      getDownloaded(torrent);
      updateDownloaded(torrent, torrentParser.size(torrent));
      tracker.getPeers(torrent, () => {});

      setStatus(torrent, "completed");

      setInterval(() => {
        tracker.getPeers(torrent, () => {});
      }, getIntervalForGetListPeer(torrent));
    }
  } catch (error) {
    console.error("Error processing files:", error);
  }
}
processFile();
