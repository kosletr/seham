"use strict";

const { logIPs, logHTTP, callPythonAPI } = require("./lib/mainFunctions");
const { getLastCompletedSesID } = require("./lib/handleHTTP");

/**
 *
 * Middleware function using mongoose and express to:
 * - Provide a simple HTTP Logging functionality.
 * - Give the web developer the ability to log and blacklist malicious/unwanted IPs.
 * - Store HTTP traffic (httplogs) as well as Client IPs (clientips) different collections in a Mongodb Database.
 * - Use it in conjuction with a Python Flask API to classify session behavior as normal or abnormal.
 *
 * @module seham
 *
 * @param {object} args
 * @param {number} args.blockDuration Duration (in seconds) that an IP Address gets blocked. (default: 60)
 * @param {boolean} args.groupToSessions Group HTTP metadata to sessions based on time. (default: true)
 * @param {function()} args.custGroupToSess (req, res) => {...} - Use a custom function to group HTTP into sessions. (default: based on timestamps)
 * @param {number} args.sessTimeThres Maximum Time Difference (in seconds) between two consecutive requests of the same session. If Time Diff is greater than this value, then requests will be split into separate sessions. (default: 30)
 * @param {number} args.maxReqsPerSess Maximum Number of Requests in a session. (default: 180)
 * @param {object} args.pythonAPIOpt Flask API Options
 * @param {boolean} args.pythonAPIOpt.useAPI Whether to use the Flask API (if available) or not. (default: false)
 * @param {number} args.pythonAPIOpt.host The Hostname of the Flask API.
 * @param {number} args.pythonAPIOpt.port The Port number of the Flask API.
 * @param {string} args.customIPHeader The name of request-header to get the client IP from. If not provided common header-names/request-properties are used instead.
 */

module.exports = function (args) {
  /* Handle Arguemtns */

  args = args || {};
  const blockDuration = args.blockDuration || 60; // in seconds
  const groupToSessions = args.groupToSessions !== false; // (default: true) Group HTTP to sessions based on time
  const custGroupToSess = args.custGroupToSess; // (default: Based on time) Use a custom function to group HTTP into sessions
  const sessTimeThres = args.sessTimeThres || 15; // (in seconds) if groupToSessions is true and default groupToSessions Function is used
  const maxReqsPerSess = args.maxReqsPerSess || 180 // if groupToSessions is true and default groupToSessions Function is used
  const pythonAPIOpt = args.pythonAPIOpt || {
    useAPI: false,
    host: "localhost",
    port: 4000,
  }; // Javascript Object - API Settings
  const customIPHeader = String(args.customIPHeader) || null; // IP Header Name

  /* Validate Arguemnts */

  if (!groupToSessions && pythonAPIOpt.useAPI) {
    console.log(
      "groupToSessions must be true when useAPI is true. Please, resolve this issue to continue."
    );
    return (req, res, next) => next();
  }

  if (parseInt(args.blockDuration * 1000) <= 0) {
    console.log(
      "blockDuration must be positive. Please, resolve this issue to continue."
    );
    return (req, res, next) => next();
  }

  if (parseInt(args.sessTimeThres * 1000) <= 0) {
    console.log(
      "sessTimeThres must positive. Please, resolve this issue to continue."
    );
    return (req, res, next) => next();
  }
  
  if (parseInt(args.maxReqsPerSess) <= 0) {
    console.log(
      "maxReqsPerSess must positive. Please, resolve this issue to continue."
    );
    return (req, res, next) => next();
  }

  return async function (req, res, next) {
    try {
      // Log New IPs - Block blacklisted IPs for 24 hours.
      await logIPs(req, res, blockDuration, customIPHeader);

      const oldWrite = res.write;
      const oldEnd = res.end;

      res.write = (...restArgs) => {
        oldWrite.apply(res, restArgs);
      };

      // After Response has been sent to the client
      res.end = async (...restArgs) => {
        // Log HTTP Traffic - Assign to Sessions based
        // on timeDiff (in sec)
        const httpMetaID = await logHTTP(
          req,
          res,
          groupToSessions,
          custGroupToSess,
          sessTimeThres,
		      maxReqsPerSess,
          customIPHeader
        );

        // If pythonAPI option is set (python API is running)
        if (pythonAPIOpt.useAPI) {
          // Get previous Session when a new session is created
          const sessionID = await getLastCompletedSesID(
            req,
            httpMetaID,
            customIPHeader
          );

          // Call Python API to handle Feature Extraction
          // and Model Predictions if sessionID not null
          if (sessionID) await callPythonAPI(sessionID, pythonAPIOpt);
        }

        oldEnd.apply(res, restArgs);
      };
    } catch (error) {
      console.log(error);
    }
    next();
  };
};
