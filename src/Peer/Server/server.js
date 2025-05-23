const net = require("net");
const message = require("../util/message");
const { inforHash } = require("../Client/TorrentParser");
const { verifyPiece } = require("../util/torrentCheck");
const { updateUploaded } = require("../Client/util");


let state = {};
const maxUploadSlots = 3;
let currentUploadSlots = {};
module.exports = {
  state,
  server: (port, torrent, pieces, piecesBuffer) => {
    currentUploadSlots[inforHash(torrent)] = 0;
    const server = net.createServer((socket) => {
      console.log("Một peer mới đã kết nối.");

      // timer
      const timeOutId = setTimeout(() => {
        console.log("Đóng kết nối vì thời gian phản hồi của peer đã quá hạn.");
        socket.end();
      }, 2 * 60 * 1000);
      // handle data
      socket.on("data", (data) => {
        // console.log(data.toString());
        msgHandler(
          socket,
          data,
          torrent,
          pieces,
          piecesBuffer,
          timeOutId,
          state
        );
      });

      // Xử lý khi một peer ngắt kết nối
      socket.on("end", () => {
        state[inforHash(torrent)] = state[inforHash(torrent)].filter(
          (st) => st.connection !== socket
        );
        console.log("Một peer đã ngắt kết nối.");
        // console.log('connection udpate: ', state.connections);
      });

      socket.on("close", () => {
        state[inforHash(torrent)] = state[inforHash(torrent)].filter(
          (st) => st.connection !== socket
        );
        clearTimeout(timeOutId);
      });
      // Xử lý lỗi
      socket.on("error", (err) => {
        console.error("Lỗi từ một peer:", err.message);
      });
    });

    server.listen(port, () => {
      console.log(`Peer lắng nghe tại cổng ${port}`);
      state[inforHash(torrent)] = [];
      //regular unchoke every 10s
      setInterval(() => {
        regularUnchoke(state[inforHash(torrent)], torrent);

        state[inforHash(torrent)].forEach((peer) => {
          // if(peer.uploaded>0) count++;
          peer.uploaded = 0; //reset uploaded
        });
      }, 10000);

      //optimistic unchoke every 30s
      setInterval(() => {
        optimisticUnchoke(state[inforHash(torrent)]);
      }, 30000);
      // setInterval(() => {
      //     state[inforHash(torrent)].forEach((peer) => {
      //         console.log(`uploaded from peer ${peer.peerId}:`, peer.uploaded);
      //     });
      // }, 5000);
    });

    // console.log("piecesBuffer in server: ", piecesBuffer);
    return server;
  },
};

function msgHandler(
  socket,
  msg,
  torrent,
  pieces,
  piecesBuffer,
  timeOutId,
  state
) {
  // console.log("msg :", msg);
  // console.log(msg.slice(0,20).toString('utf8', 1));
  if (isHandshake(msg)) {
    const receivedMsg = parseHandshake(msg);

    if (receivedMsg.inforHash.equals(inforHash(torrent))) {
      socket.write(message.buildHandshake(torrent));
      socket.write(
        message.buildBitfield(
          createBitfieldFromList(pieces, torrent, piecesBuffer)
        )
      );
      // console.log("bitfield message will send: ",message.buildBitfield(createBitfieldFromList(pieces)));

      const newPeer = {
        peerId: receivedMsg.peerId,
        connection: socket,
        uploaded: 0,
        choked: true,
        interested: false,
      };
      if (!state[inforHash(torrent)]) state[inforHash(torrent)] = [];

      state[inforHash(torrent)].push(newPeer);
    } else {
      console.log("Info hash does not match, terminating connection.");
      socket.end();
    }
  } else {
    const m = message.parse(msg);
    // if(m.id != 6) console.log("received msg: ", m);
    if (m.size == 0) keepAliveHandler(socket, timeOutId);
    if (m.id == 2) interestedHandler(socket, torrent);
    if (m.id == 3) uninterestedHandler(socket, torrent);
    if (m.id == 6) requestHandler(socket, m.payload, piecesBuffer, torrent);
  }
}

function parseHandshake(msg) {
  return {
    peerId: msg.slice(48, 68),
    inforHash: msg.slice(28, 48),
  };
}

function isHandshake(msg) {
  return (
    msg.length === msg.readUInt8(0) + 49 &&
    msg.slice(0, 20).toString("utf8", 1) === "BitTorrent protocol"
  );
}

function keepAliveHandler(socket, timeOutId) {
  console.log("received keep alive msg");
  clearTimeout(timeOutId);
  timeOutId = setTimeout(() => {
    console.log("Đóng kết nối vì thời gian phản hồi của peer đã quá hạn.");
    socket.end();
  }, 2 * 60 * 1000);
}

function interestedHandler(socket, torrent) {
  //TODO: do logic something to decide unchoke or not
  console.log("received interested msg");
  state[inforHash(torrent)].find(
    (peer) => peer.connection === socket
  ).interested = true;
  // console.log('current upload slot: ',currentUploadSlots[inforHash(torrent)]);/
  if (currentUploadSlots[inforHash(torrent)] < maxUploadSlots) {
    state[inforHash(torrent)].find(
      (peer) => peer.connection === socket
    ).choked = false;
    socket.write(message.buildUnchoke());
    currentUploadSlots[inforHash(torrent)]++;
  }
}

function createBitfieldFromList(pieces, torrent, piecesBuffer) {
  let bitfield = "";
  for (let i = 0; i < torrent.info["pieces"].length / 20; i++) {
    bitfield += pieces.havePiece(i) ? "1" : "0";
  }
  // let bitfield = pieces._received.map((piece, index) => piece.every(el=>el) ? verifyPiece(piecesBuffer[index], index, torrent)? '1':'0' : '0').join('');
  //spare zero
  while (bitfield.length % 8 !== 0) {
    bitfield += "0";
  }
  // console.log("bitfield: ", bitfield);
  const byteArray = [];
  for (let i = 0; i < bitfield.length; i += 8) {
    byteArray.push(parseInt(bitfield.slice(i, i + 8), 2));
  }
  const buffer = Buffer.from(byteArray);

  // console.log("bitfield will response:",buffer);
  return buffer;
}

function requestHandler(socket, payload, piecesBuffer, torrent) {
  // console.log(payload);
  const { index, begin, length: lengthRequested } = payload;
  // convert lenghtRequested from buffer to num
  const length = lengthRequested.readUInt32BE(0);

  // console.log(`Received Request: index=${index}, begin=${begin}, length=${length}`);

  sendPiece(socket, index, begin, length, piecesBuffer, torrent);
}

function sendPiece(
  socket,
  index,
  begin,
  lengthRequested,
  piecesBuffer,
  torrent
) {
  // const pieceData = piecesBuffer[index]; // Lấy dữ liệu của phần tương ứng
  updateUploaded(torrent, lengthRequested);
  // if (pieceData) {
  // Cắt dữ liệu đúng size bắt đầu từ begin
  const dataToSend = piecesBuffer.slice(
    index * torrent.info["piece length"] + begin,
    index * torrent.info["piece length"] + begin + lengthRequested
  );

  if (dataToSend.byteLength > 0) {
    // Gửi lại dữ liệu
    const responseMsg = Buffer.alloc(13 + dataToSend.byteLength);

    responseMsg.writeUInt32BE(dataToSend.byteLength + 9, 0);
    responseMsg.writeUInt8(7, 4);
    responseMsg.writeUInt32BE(index, 5);
    responseMsg.writeUInt32BE(begin, 9);
    Buffer.from(dataToSend).copy(responseMsg, 13);

    socket.write(responseMsg);
    // console.log(`Sent piece: index=${index}, begin=${begin}, length=${dataToSend.length}`);
  }
  // console.log(`Sent piece: index=${index}, begin=${begin}, length=${dataToSend.byteLength}`);
  // } else {
  //     console.error(`Requested piece ${index} not found.`);
  // }
}

function uninterestedHandler(socket, torrent) {
  console.log("received uninterested msg");
  const target = state[inforHash(torrent)].find(
    (peer) => peer.connection === socket
  );
  target.interested = false;
  if (!target.choked) {
    target.connection.write(message.buildChoke());
    currentUploadSlots[inforHash(torrent)]--;
  }
}

function regularUnchoke(state, torrent) {
  currentUploadSlots[inforHash(torrent)] = 0;
  state.sort((a, b) => a.uploaded - b.uploaded);
  for (let i = 0; i < state.length; i++) {
    if (state[i]) {
      if (
        currentUploadSlots[inforHash(torrent)] < maxUploadSlots &&
        state[i].interested
      ) {
        if (state[i].choked) {
          state[i].connection.write(message.buildUnchoke());
          state[i].choked = false;
        }
        currentUploadSlots[inforHash(torrent)]++;
      } else {
        state[i].choked = true;
        state[i].connection.write(message.buildChoke());
      }
    }
  }
}

function optimisticUnchoke(state) {
  const chokedPeers = state.filter((peer) => peer.choked);
  if (chokedPeers.length > 0) {
    const randomIndex = Math.floor(Math.random() * chokedPeers.length);
    if (chokedPeers.interested && chokedPeers.choked)
      chokedPeers[randomIndex].connection.write(message.buildUnchoke());
  }
}
