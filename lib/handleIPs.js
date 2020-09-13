const { ClientIPs } = require("./logModels");

/**
 * Add new client IPs to Mongodb collection named: clientips.
 *
 * @param {string} ip The IP of the Client.
 */
async function saveClientIP(ip) {
  try {
    await ClientIPs.findOneAndUpdate(
      { clientIP: ip },
      {},
      { upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    console.log(error);
  }
}

/**
 * Return Forbidden Status Code (403) if an IP is blacklisted.
 *
 * @param {string} ip  The IP of the Client.
 * @param {object} res The reponse object.
 * @param {number} blockDuration Blacklist duration of a given client IP.
 */
async function handleBlacklist(ip, res, blockDuration) {
  try {
    // Check if IP is blacklisted (returns null if not)
    const ipObject = await ClientIPs.findOne({
      clientIP: ip,
      blacklisted: true,
    });

    // After bltime (in ms) remove blacklist-tag
    if (ipObject) {
      new Date() - ipObject.blacklistTime < blockDuration
        ? res.status(403).end()
        : await ClientIPs.updateOne({ clientIP: ip }, { blacklisted: false });
    }
  } catch (error) {
    console.log(error);
  }
}

module.exports = { saveClientIP, handleBlacklist };
