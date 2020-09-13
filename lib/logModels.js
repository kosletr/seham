const mongoose = require("mongoose");

/* 
  - Add a new mongoose collection 
  to save every distinct IP address
  as well as info about its status
  (blacklisted or not, blacklistTime) 
 */
const ClientIPs = mongoose.model(
  "clientIP",
  new mongoose.Schema({
    clientIP: {
      type: String,
      required: true,
      minlength: 0,
      maxlength: 90,
    },
    blacklisted: {
      type: Boolean,
      required: true,
      default: false,
    },
    blacklistTime: {
      type: Date,
      default: new Date(),
      required: true,
    },
  })
);

const HttpLogs = mongoose.model(
  "httpLog",
  new mongoose.Schema({
    headers: {
      type: Object,
      required: true,
    },
    method: {
      type: String,
      required: true,
      minlength: 0,
      maxlength: 10,
    },
    statusCode: {
      type: Number,
      required: true,
      min: 0,
      max: 1000,
    },
    clientIP: {
      type: String,
      required: true,
      minlength: 0,
      maxlength: 90,
    },
    url: {
      type: String,
      required: true,
      minlength: 0,
      maxlength: 256,
    },
    fullUrl: {
      type: String,
      required: true,
      minlength: 0,
      maxlength: 256,
    },
    reqhttp: {
      type: String,
      required: true,
      minlength: 0,
      maxlength: 256,
    },
    requestSize: {
      type: Number,
      required: true,
    },
    resContentType: {
      type: Object,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    requestBody: {
      type: Object,
      required: false,
    },
    sessionID: {
      type: String,
      required: true,
      minlength: 0,
      maxlength: 256,
    },
  })
);

const SesFeatures = mongoose.model(
  "sesFeature",
  new mongoose.Schema({
    sessionID: {
      type: String,
      required: true,
    },
    clientIP: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    sesCodes4xx: {
      type: Number,
      required: true,
    },
    sesDuration: {
      type: Number,
      required: true,
    },
    sesImages: {
      type: Number,
      required: true,
    },
    sesPDFs: {
      type: Number,
      required: true,
    },
    numOfReqs: {
      type: Number,
      required: true,
    },
    behavior: {
      type: String,
      default: "newSession",
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
      required: true,
    },
  })
);

module.exports = { ClientIPs, HttpLogs, SesFeatures };
