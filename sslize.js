#! /usr/bin/env node
// Strict-Transport-Security: max-age=15768000 ; includeSubDomains

const { log, warn, die } = require("./logger.js");

if (process.argv.length < 5) {
  log("Usage: sslize email protocol://host:port productionServer(true|false)");
  log(" eg: sslize john@example.com http://destinationServer-web-server.com:8080 false");
  log(process.argv);
  process.exit(1);
}

const os = require("os");
const home = os.homedir();
const path = require("path");
const fs = require("fs");

const httpProxy = require("http-proxy");
const GreenLockExpress = require("greenlock-express");

const greenlockConfig = require("./green-lock-config.js");
const { loadRegistered, addSite } = require("./helpers.js");
const proxy = httpProxy.createProxyServer({ xfwd: true });

const [email, destinationServer, isProductionServerString] = process.argv.slice(2);
const isProductionServer = isProductionServerString === "true";
const isStagingServer = !isProductionServer;

const greenlockConfigDir = path.join(home, ".greenlock");
const doesGreenlockConfigDirExists = !!fs.existsSync(greenlockConfigDir);

log("ARGUMENTS RECEIVED");
log("-------------------------------------------");
log(process.argv);
log("-------------------------------------------");
log(`
PARSED:
	email: ${email}
  destinationServer: ${destinationServer}
  isProductionServer: ${isProductionServer}
  isStagingServer: ${isStagingServer}

  greenlock config file.....exists? ${doesGreenlockConfigDirExists ? "YES" : "NO"}

`);
log("-------------------------------------------");

const registeredCertificates = loadRegistered();
const greenlockexpress = GreenLockExpress.init({
  ...greenlockConfig,
  notify: (errorType, errorArguments) => {
    warn(`GreenLockExpress.Notify Error Event Receied\n\n\n`, errorType, errorArguments);
    // if (errorType !== 'servername_unknown') {
    //   return warn(errorType, errorArguments);
    // }

    // const { servername } = errorArguments;
    // addSite(servername, die);
  },
});

greenlockexpress.ready(processRequest);

function processRequest(glx) {
  glx.serveApp(function (req, res) {
    const host = req.headers.host;

    // Invalid hosts
    if (!host) {
      const errMessage = `Host is not valid: '${host}'`;
      log(errMessage);
      res.statusCode = 500;
      res.write(errMessage);
      res.end();
      return;
    }

    // Request without domain names: ip address
    const doesRequestedHostIsAnIP = !isNaN(host[0].charAt(0));

    if (doesRequestedHostIsAnIP) {
      const errMessage = `IP address aren't valid ones`;
      log(errMessage);
      res.statusCode = 500;
      res.write(errMessage);
      res.end();
      return;
    }

    // Registered hosts
    if (registeredCertificates.includes(host)) {
      log(`Host already registered: ${req.headers.host}${req.url}`);
      proxy.web(req, res, { target: destinationServer, preserveHeaderKeyCase: true, followRedirects: true }, (firstArg, ...othersArgs) => log(firstArg));
      return;
    }

    throw new Error("Unreachable code reached");
  });
}

log(`Starting: ${registeredCertificates.join(", ")}`);
