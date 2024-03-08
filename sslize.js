#! /usr/bin/env node
// Strict-Transport-Security: max-age=15768000 ; includeSubDomains

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function die(...args) {
  log(...args);
  process.exit(1);
}

// Initial Checking
if (process.argv.length < 5) {
  log("Usage: sslize email protocol://host:port productionServer(true|false)");
  log(" eg: sslize john@example.com http://destinationServer-web-server.com:8080 false");
  log(process.argv);
  process.exit(1);
}

// REQUIRES
const home = require("home")();
const httpProxy = require("http-proxy");
const projectPackageJson = require("./package.json");
const request = require("request");
const axios = require("axios");
const https = require("https");
const path = require("path");
const http = require("http");
const tls = require("tls");
const fs = require("fs");

const GreenLock = require("greenlock");
const GreenLockExpress = require("greenlock-express");
const http01 = require("acme-http-01-standalone").create({});

// INPUT ARGS
const [email, destinationServer, isProductionServerString] = process.argv.slice(2);
const isProductionServer = isProductionServerString === "true";
const isStagingServer = !isProductionServer;

// OBJECTS, REQUIRED
const proxy = httpProxy.createProxyServer({ xfwd: true });
const sslizetoken = Math.random().toString().substring(2);

const sslizeJsonDatabasePath = path.join(home, ".sslize.json");
const doesSslizeJsonDatabasePathExists = !!fs.existsSync(sslizeJsonDatabasePath);

const greenlockConfigDir = path.join(home, ".greenlock");
const doesGreenlockConfigDirExists = !!fs.existsSync(greenlockConfigDir);


log("ARGUMENTS RECEIVED");
log("-------------------------------------------");
log(process.argv);
log("-------------------------------------------");
log(`
PARSED: 
	maintainerEmail: ${email}
  destinationServer: ${destinationServer}
  isProductionServer: ${isProductionServer}
  isStagingServer: ${isStagingServer}

  sslize.json...............exists? ${doesSslizeJsonDatabasePathExists ? "YES" : "NO"}
  greenlock config file.....exists? ${greenlockConfigDir ? "YES" : "NO"}
  
`);
log("-------------------------------------------");

const greenlockexpress = GreenLockExpress.init({
  packageRoot: __dirname,
  manager: {
    module: "@greenlock/manager",
  },
  configDir: greenlockConfigDir,
  staging: isStagingServer,
  maintainerEmail: email,
  packageAgent: `${projectPackageJson.name}/${projectPackageJson.version}`,
  store: {
    module: "greenlock-store-fs",
    basePath: greenlockConfigDir,
  },
  challenges: {
    "http-01": http01,
  },
});

greenlockexpress.ready(processRequest);

const registeredCertificates = loadRegistered();

function loadRegistered() {
  if (!doesSslizeJsonDatabasePathExists) {    
    fs.writeFileSync(sslizeJsonDatabasePath, JSON.stringify({}));
  }

  const sslizeDatabaseContents = fs.readFileSync(sslizeJsonDatabasePath, "utf8");
  const sslizeDatabaseData = JSON.parse(sslizeDatabaseContents);
  return sslizeDatabaseData;
}

function saveRegistered() {
  fs.writeFileSync(sslizeJsonDatabasePath, JSON.stringify(registeredCertificates));
}

function addSite(host, successCallback, errorCallback) {
  const greenlock = GreenLock.create({
    packageRoot: __dirname,
    manager: {
      module: "@greenlock/manager",
    },
    configDir: greenlockConfigDir,
    staging: isStagingServer,
    maintainerEmail: email,
    packageAgent: `${projectPackageJson.name}/${projectPackageJson.version}`,
    store: {
      module: "greenlock-store-fs",
      basePath: greenlockConfigDir,
    },
    challenges: {
      "http-01": http01,
    },
  });


  greenlock.add({ subject: host, altnames: [host] }).then(function (certs) {
    log("Successfully registeredCertificates ssl cert");
    registeredCertificates[host] = certs;
    saveRegistered();

    if (!global.certdb) {
      global.certdb = {};
    }

    global.certdb[host] = tls.createSecureContext({
      key: certs.privkey,
      cert: certs.cert + certs.chain,
    });

    successCallback();
  }, errorCallback);
}

// SSL Registration
async function registerSSL(host, successCallback, errorCallback) {
  request({ url: `http://${host}`, headers: { sslizetoken: sslizetoken } }, function (err, response, body) {
    if (err) {
      errorCallback(`Checking token: Request Error`);
    } else if (body !== sslizetoken) {
      errorCallback(`Checking token: Token verify error - unknow request`);
    } else if (body === sslizetoken) {
      log(`Checking token: Success`);
      log(`Asking lets encrypt: '${host}'`);
      addSite(host,successCallback,errorCallback);
    }
  });
}

// Starting HTTP and HTTPS Servers
log(`Starting: ${Object.keys(registeredCertificates).join(", ")}`);

https
  .createServer(
    {
      SNICallback: function (domain, callBack) {
        if (global.certdb && global.certdb[domain]) {
          callBack(null, global.certdb[domain]);
        } else {
          registerSSL(
            domain,
            function () {
              callBack(null, global.certdb[domain]);
            },
            function (err) {
              die(err);
            }
          );
        }
      },
    },
    async function (req, res) {
      log(`Received SECURE request ${req.headers.host}${req.url}`);
      processRequest(req, res, destinationServer);
    }
  )
  .listen(443);

http
  .createServer(async function (req, res) {
    log(`Received PLAIN request ${req.headers.host}${req.url}`);
    processRequest(req, res, destinationServer);
  })
  .listen(80);

function processRequest(glx) {
  glx.serveApp(function (req, res) {
    const host = req.headers.host;

    // Invalid hosts
    if (!host) {
      log(`Host is not valid: '${host}'`);
      res.statusCode = 500;
      res.write(errMessage);
      res.end();
      return;
    }

    // Request without domain names: ip address
    const doesRequestedHostIsAnIP = !isNaN(host[0]);

    if (doesRequestedHostIsAnIP) {
      log(`IP address aren't valid ones`);
      res.statusCode = 500;
      res.write(errMessage);
      res.end();
      return;
    }

    function processRegisteredHostsRequests() {
      if (registeredCertificates[host]) {
        log(`Host registered: ${req.headers.host}${req.url}`);
        proxy.web(req, res, { target: destinationServer });
        return;
      }
    }
      
    // Loopback check response - used to check domain before asking acme to generate ssl
    if (req.headers?.sslizetoken === sslizetoken) {
      res.write(sslizetoken);
      res.statusCode = 200;
      res.end();
      return;
    }

    // Registered hosts
    if (registeredCertificates[host]) {
      log(`Host already registered: ${req.headers.host}${req.url}`);
      proxy.web(req, res, { target: destinationServer });
      return;
    }

    addSite(host, () => {
      log(`Just registered host: ${req.headers.host}${req.url}`);
      proxy.web(req, res, { target: destinationServer });
      return;
    }, die);
  });
}
