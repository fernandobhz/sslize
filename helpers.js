const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require('child_process');
const GreenLock = require("greenlock");
const greenlockConfig = require('./green-lock-config.js');
const { log, warn, die } = require('./logger.js');

const greenlock = GreenLock.create(greenlockConfig);

exports.loadRegistered = () => {
  const homeDir = os.homedir();
  const configFile = path.join(homeDir, ".greenlock", "config.json");

  try {
    const configData = fs.readFileSync(configFile, "utf8");
    const config = JSON.parse(configData);

    if (!config.sites || !Array.isArray(config.sites)) {
      throw new Error('Invalid config format: "sites" key is missing or not an array');
    }

    const subjects = config.sites.map(site => site.subject);
    
    return subjects;
  } catch (err) {
    console.error("Error reading config file:", err);
    return [];
  }
};

exports.addSite = (host, errorCallback) => {
  greenlock.add({ subject: host, altnames: [host] }).then(() => {
    log(`Registered new domain: '${host}', restarting the process, calling process.exit(0).`)
    process.exit(0);
  }, errorCallback);
}
