"use strict";
const util = require("../Client/util");
const Buffer = require("buffer").Buffer;
const torrentParser = require("../Client/TorrentParser");

module.exports.buildHandshake = (torrent, infoHash = false, peerId = false) => {
  const buf = Buffer.alloc(68);
  // pstrlen
  buf.writeUInt8(19, 0);
  // pstr
  buf.write("BitTorrent protocol", 1);
  // reserved
  buf.writeUInt32BE(0, 20);
  buf.writeUInt32BE(0, 24);
  // info hash
  if (infoHash) infoHash.copy(buf, 28);
  else {
    torrentParser.inforHash(torrent).copy(buf, 28);
  }
  // peer id
  if (peerId) {
    peerId.copy(buf, 48);
    // console.log("peerId in message: ", peerId);
  } else util.genID(torrent).copy(buf, 48);
  //   buf.write(util.genID());
  return buf;
};

module.exports.buildKeepAlive = () => Buffer.alloc(4);

module.exports.buildChoke = () => {
  const buf = Buffer.alloc(5);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(0, 4);
  return buf;
};

module.exports.buildUnchoke = () => {
  const buf = Buffer.alloc(5);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(1, 4);
  return buf;
};

module.exports.buildInterested = () => {
  const buf = Buffer.alloc(5);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(2, 4);
  return buf;
};

module.exports.buildUninterested = () => {
  const buf = Buffer.alloc(5);
  // length
  buf.writeUInt32BE(1, 0);
  // id
  buf.writeUInt8(3, 4);
  return buf;
};

module.exports.buildHave = (payload) => {
  const buf = Buffer.alloc(9);
  // length
  buf.writeUInt32BE(5, 0);
  // id
  buf.writeUInt8(4, 4);
  // piece index
  buf.writeUInt32BE(payload, 5);

  // console.log("have msg: ", buf);
  return buf;
};

module.exports.buildBitfield = (bitfield) => {
  const buf = Buffer.alloc(bitfield.length + 5);
  // length
  buf.writeUInt32BE(bitfield.length + 1, 0);
  // id
  buf.writeUInt8(5, 4);
  // bitfield
  bitfield.copy(buf, 5);
  return buf;
};

module.exports.buildRequest = (pieceBlock) => {
  const buf = Buffer.alloc(17);
  // length
  buf.writeUInt32BE(13, 0);
  // id
  buf.writeUInt8(6, 4);
  // piece index
  buf.writeUInt32BE(pieceBlock.index, 5);
  // begin
  buf.writeUInt32BE(pieceBlock.begin, 9);
  // length
  buf.writeUInt32BE(pieceBlock.length, 13);
  return buf;
};

module.exports.buildPiece = (payload) => {
  const buf = Buffer.alloc(payload.block.length + 13);
  buf.writeUInt32BE(payload.block.length + 9, 0);
  buf.writeUInt8(7, 4);
  buf.writeUInt32BE(payload.index, 5);
  buf.writeUInt32BE(payload.begin, 9);
  payload.block.copy(buf, 13);
  return buf;
};

module.exports.buildCancel = (payload) => {
  const buf = Buffer.alloc(17);
  // length
  buf.writeUInt32BE(13, 0);
  // id
  buf.writeUInt8(8, 4);
  // piece index
  buf.writeUInt32BE(payload.index, 5);
  // begin
  buf.writeUInt32BE(payload.begin, 9);
  // length
  buf.writeUInt32BE(payload.length, 13);
  return buf;
};

module.exports.buildPort = (payload) => {
  const buf = Buffer.alloc(7);
  // length
  buf.writeUInt32BE(3, 0);
  // id
  buf.writeUInt8(9, 4);
  // listen-port
  buf.writeUInt16BE(payload, 5);
  return buf;
};

module.exports.parse = (msg) => {
  const id = msg.length > 4 ? msg.readInt8(4) : null;
  let payload = msg.length > 5 ? msg.slice(5) : null;
  if (id === 6 || id === 7 || id === 8) {
    const rest = payload.slice(8);
    payload = {
      index: payload.readInt32BE(0),
      begin: payload.readInt32BE(4),
    };
    payload[id === 7 ? "block" : "length"] = rest;
  }

  return {
    size: msg.readInt32BE(0),
    id: id,
    payload: payload,
  };
};
