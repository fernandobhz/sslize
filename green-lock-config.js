const { log, warn, die } = require("./logger.js");
const path = require("path");
const os = require("os");
const http01 = require("acme-http-01-standalone").create({});

const home = os.homedir();
const greenlockConfigDir = path.join(home, ".greenlock");
const projectPackageJson = require("./package.json");

const [email, destinationServer, isProductionServerString] = process.argv.slice(2);
const isProductionServer = isProductionServerString === "true";
const isStagingServer = !isProductionServer;

const config = {
  packageRoot: __dirname,
  manager: {
    module: "@greenlock/manager",
  },
  configDir: greenlockConfigDir,
  staging: isStagingServer,
  subscriberEmail: email,
  maintainerEmail: email,
  packageAgent: `${projectPackageJson.name}/${projectPackageJson.version}`,
  store: {
    module: "greenlock-store-fs",
    basePath: greenlockConfigDir,
  },
  challenges: {
    "http-01": http01,
  },
};

log(JSON.stringify(config, null, 2));

module.exports = config;
