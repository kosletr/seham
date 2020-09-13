const { HttpLogs } = require("./logModels");
const mime = require("mime");

/**
 * Given a single IP, find the corresponding recently logged Requests.
 *
 * @param {string} ip The IP of the Client.
 * @return {Promise<object[]>} Resolves to an array of the recent Request Obejcts.
 */
function getRequestsFromIP(ip) {
    return HttpLogs.find({
      clientIP: ip,
      timestamp: { $gte : new Date(Date.now() - 10*60*1000)} // 10 minutes
    })
      .select({ _id: 1, timestamp: 1, sessionID: 1 })
      .sort("-timestamp")
}

/**
 * Extract client's IP from a given request.
 *
 * @param {object} req Request Object to extract the IP from.
 * @param {string} customIPHeader Use a custom header-name to extract the client's IP.
 */

function getIPFromReq(req, customIPHeader) {
  return (
    req.headers[customIPHeader] ||
    req.headers["x-client-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.headers["cf-connecting-ip"] ||
    req.headers["fastly-client-ip"] ||
    req.headers["true-client-ip"] ||
    req.headers["x-real-ip"] ||
    req.headers["x-cluster-client-ip"] ||
    req.headers["x-forwarded"] ||
    req.headers["forwarded-for"] ||
    req.connection.remoteAddress ||
    req.connection.socket.remoteAddress ||
    req.socket.remoteAddress ||
    req.info.remoteAddress ||
    req.requestContext.identity.sourceIp
  );
}

/**
 * Given an array of requests, split them into sessions based on timestamps.
 *
 * @param {object[]} reqArray Array of a client's recent requests.
 * @param {number} maxDt Maximum time difference allowed between two consecutive requests of the same session.
 * @param {number} maxReqs Maximum number of requests in a session.
 */
async function splitToSessions(reqArray, maxDt, maxReqs) {
  try {
    if (reqArray[0].sessionID == "newRequest") {
      reqArray[0].sessionID = reqArray[0]._id;
      await HttpLogs.updateOne(
        { _id: reqArray[0]._id },
        { sessionID: reqArray[0]._id }
      );
    }
    let sesID;
    for (let i = 1; i < reqArray.length; i++) {
      // If req not classified
      if (reqArray[i].sessionID == "newRequest") {
        reqsPrevSess = await HttpLogs.countDocuments({sessionID: reqArray[i - 1].sessionID})
        // Update SessionID
        sesID =
          reqArray[i].timestamp - reqArray[i - 1].timestamp > maxDt || reqsPrevSess >= maxReqs
            ? reqArray[i]._id
            : reqArray[i - 1].sessionID;

        reqArray[i].sessionID = sesID;

        await HttpLogs.updateOne(
          { _id: reqArray[i]._id },
          { sessionID: sesID }
        );
      }
    }
  } catch (error) {
    console.log(error);
  }
}

/**
 * Extract Useful Metadata from request and store them to Mongodb collection named: httplogs.
 *
 * @param {object} req The request object.
 * @param {object} res The response object.
 * @param {string} customIPHeader Use a custom header-name to extract the client's IP.
 * @returns {Promise} Resolves to storing the Metadata to Mongodb and returning the object stored.
 */

function saveUsefulMeta(req, res, customIPHeader) {
  const ip = getIPFromReq(req, customIPHeader);

  httpReqRes = {};

  httpReqRes.headers = req.headers;
  httpReqRes.method = req.method;

  httpReqRes.clientIP = ip;

  httpReqRes.url = req.originalUrl;

  httpReqRes.fullUrl = `${req.protocol}://${req.get("host")}${req.originalUrl}`;

  httpReqRes.reqhttp = `${req.method} ${req.url}`;
  httpReqRes.requestSize = req.socket.bytesRead;
  httpReqRes.resContentType = { type: mime.getType(req.originalUrl) };
  httpReqRes.timestamp = new Date();
  httpReqRes.requestBody = req.body;
  httpReqRes.requestParams = req.params;
  httpReqRes.statusCode = res.statusCode;
  httpReqRes.sessionID = "newRequest";

  // Save Req/Res Medata to Mongo Collection httplogs
  return new HttpLogs(httpReqRes).save();
}

/**
 * Get the session ID of the latest completed session.
 * A session is considered completed as soon as a new
 * session from the same client IP is created.
 *
 * @param {object} req The request object.
 * @param {string} httpMetaID The collection's ID of the correspondig stored request.
 * @param {string} customIPHeader Use a custom header-name to extract the client's IP.
 */

async function getLastCompletedSesID(req, httpMetaID, customIPHeader) {
  try {
    // Find the current request in the database
    const currentReq = await HttpLogs.findOne({ _id: httpMetaID });

    // If this is not a new session return null
    if (currentReq._id != currentReq.sessionID) return null;

    // Get Current IP
    const ip = getIPFromReq(req, customIPHeader);

    // Get Previous Request based on timestamp and IP
    const previousRequest = await HttpLogs.findOne({
      clientIP: ip,
      timestamp: { $lt: currentReq.timestamp },
    }).sort("-timestamp");
    return previousRequest ? previousRequest.sessionID : null;
  } catch (error) {
    console.log(error);
  }
}

module.exports = {
  getIPFromReq,
  saveUsefulMeta,
  getRequestsFromIP,
  splitToSessions,
  getLastCompletedSesID,
};
