const tracker = require("./Client/Tracker");
const torrentParser = require("./Client/TorrentParser");
const download = require("./Client/download");
const { server, state } = require("./Server/server");
const { processFiles } = require("./Client/RnWPieces");
const { selectFiles } = require("./Client/chooseFile");

const { createProgressList, setTimer } = require("./Client/Properties");
const {
  genPort,
  getIntervalForGetListPeer,
  setStatus,
  getStatus,
  updateDownloaded,
  getDownloaded,
} = require("./Client/util");
const path = require("path");
const args = process.argv.slice(2);
const torrentPath = "QLDA.mp4.torrent";
const torrent = torrentParser.open("torrent_file/" + torrentPath);

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
