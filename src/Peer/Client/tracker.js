const http = require("http");
const torrentParser = require("./TorrentParser");
const {
  genID,
  genPort,
  getDownloaded,
  getUploaded,
  getStatus,
  setIntervalForGetListPeer,
  getLeft,
} = require("./util");

module.exports.getPeers = async (torrent, callback) => {
  try {
    const announceReq = buildAnnounceReq(
      torrent,
      getStatus(torrent),
      getDownloaded(torrent),
      getUploaded(torrent),
      getLeft(torrent)
    );
    const resp = await httpGET("127.0.0.1", 8888, announceReq);

    setIntervalForGetListPeer(torrent, JSON.parse(resp).interval);
    callback(JSON.parse(resp).peers);
  } catch (error) {
    console.error("Error occurred:", error);
  }
};

module.exports.scrape = async (torrent) => {
  try {
    const scrapeReq = buildScrapeReq(torrent);
    const resp = await httpGET("127.0.0.1", 8888, scrapeReq);
    console.log("Scrape response:", resp);
  } catch (error) {
    console.error("Error occurred:", error);
  }
};

function httpGET(hostname, port, param) {
  const jsonParam = JSON.stringify(param);
  const url = `http://${hostname}:${port}/?${encodeURIComponent(jsonParam)}`;
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
          responseData += chunk; // Get data from server
        });

        res.on("end", () => {
          resolve(responseData);
        });
      })
      .on("error", (error) => {
        console.log(`Problem with error: ${error.message}`);
        reject(error);
      });
  });
}

//gen port do chạy cùng máy
function buildAnnounceReq(
  torrent,
  event = "started",
  downloaded = 0,
  uploaded = 0,
  left = 0,
  port = genPort(torrentParser.inforHash(torrent))
) {
  return {
    connection_id: 0x41727101980,
    action: "announce",
    info_hash: torrentParser.inforHash(torrent),
    peer_id: genID(torrent),
    event,
    downloaded,
    left,
    uploaded,
    IP_address: "127.0.0.1",
    port,
    num_want: -1,
    transaction_id: 0x88,
    compact: 0,
  };
}

function buildScrapeReq(torrent) {
  return {
    action: "scrape",
    info_hash: torrentParser.inforHash(torrent),
  };
}
