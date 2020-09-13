const { saveClientIP, handleBlacklist } = require("./handleIPs");
const {
  getIPFromReq,
  saveUsefulMeta,
  getRequestsFromIP,
  splitToSessions,
} = require("./handleHTTP");
const http = require("http");

/**
 *
 * Log incoming IPs
 * - Add new client IPs to the Mongodb collection, clientips
 * - Return Forbidden Status Code (403) if an IP is blacklisted
 * - Remove blacklist-tag if IP is blacklisted for more than bltime (in sec)
 *
 * @param {object} req The request object.
 * @param {object} res The response object.
 * @param {number} blockDuration Blacklist duration of a given client IP.
 * @param {string} customIPHeader Use a custom header-name to extract the client's IP.
 */

async function logIPs(req, res, blockDuration, customIPHeader) {
  try {
    const ip = getIPFromReq(req, customIPHeader);
    // Add new client IPs to the database
    await saveClientIP(ip);

    // Return Forbidden Status Code if an IP
    // is blacklisted and remove blacklist-tag
    // if IP is blacklisted for more than bltime
    await handleBlacklist(ip, res, blockDuration * 1000);
  } catch (error) {
    console.log(error);
  }
}

/**
 *
 * Log HTTP Traffic
 * - Log HTTP Requests/Responses
 * - Split them into sessions based on certain criteria
 *
 * @param {object} req The request object.
 * @param {object} res The response object.
 * @param {boolean} groupToSessions Whether to group requests into sessions or not.
 * @param {callback} customGroupToSessionsFunc Function based on which the request is asigned to a session.
 * @param {number} maxDt Maximum time difference allowed between two consecutive requests of the same session.
 * @param {number} maxReqs Maximum number of requests in a session.
 * @param {string} customIPHeader Use a custom header-name to extract the client's IP.
 */

async function logHTTP(
  req,
  res,
  groupToSessions,
  customGroupToSessionsFunc,
  maxDt,
  maxReqs,
  customIPHeader
) {
  try {
    // Get the current IP
    const ip = getIPFromReq(req, customIPHeader);
    // Save current Req/Res Medata to a Mongo Collection
    const httpMetaID = await saveUsefulMeta(req, res, customIPHeader);

    if (groupToSessions) {
      if (customGroupToSessionsFunc) {
        await customGroupToSessionsFunc(req, res);
      } else {
        // Get older Req/Res's to classify the current
        // to a session (Sorted by timestamp in ascending order)
        const reqArray = (await getRequestsFromIP(ip)).reverse();

        // Classify current Req/Res to the appropriate session
        await splitToSessions(reqArray, maxDt * 1000, maxReqs);
      }
    }
    return httpMetaID._id;
  } catch (error) {
    console.log(error);
  }
}

/* 
  Call Python API to handle Feature Extraction 
  and Model Predictions
*/
function callPythonAPI(sessionID, pythonAPIOpt) {
  const postData = JSON.stringify({
    sesID: sessionID,
  });

  const options = {
    hostname: String(pythonAPIOpt.host),
    port: parseInt(pythonAPIOpt.port),
    path: "/api",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": postData.length,
    },
  };

  const pyReq = http.request(options, (pyRes) => {
    pyRes.on("data", (d) => {
      console.log(
        `${d.toString("utf8").trim()} - Response: ${pyRes.statusCode}`
      );
    });
  });

  pyReq.on("error", (e) => {
    console.error(e);
  });

  pyReq.write(postData);
  pyReq.end();
}

module.exports = {
  logIPs,
  logHTTP,
  callPythonAPI,
};
