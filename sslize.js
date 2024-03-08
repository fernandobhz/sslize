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
const GreenLock = require("@root/greenlock");
const GreenLockStoreFs = require("greenlock-store-fs");

// INPUT ARGS
const [email, destinationServer, isProductionServerString] = process.argv.slice(2);
const isProductionServer = isProductionServerString === "true";
const isStagingServer = !isProductionServer;

// OBJECTS, REQUIRED
const proxy = httpProxy.createProxyServer({ xfwd: true });
const sslizetoken = Math.random().toString().substring(2);

// REGISTERED ---------------------------------------- REMOVE BEFORE PUBLISHING
if (doesAnyConfigFileExists) {
  fs.rmSync(sslizeJsonDatabasePath);
  fs.rmSync(letsEncryptDataPath, { recursive: true, force: true });
  fs.rmSync(greenlockConfigDir, { recursive: true, force: true });
}

const sslizeJsonDatabasePath = path.join(home, ".sslize.json");
const doesSslizeJsonDatabasePath = !!fs.existsSync(sslizeJsonDatabasePath);

const letsEncryptDataPath = path.join(home, "letsencrypt");
const doesLetsEncryptDataPathExists = !!fs.existsSync(letsEncryptDataPath);

const greenlockConfigDir = path.join(home, ".greenlock");
const doesGreenlockConfigDir = !!fs.existsSync(greenlockConfigDir);

const doesAnyConfigFileExists = doesSslizeJsonDatabasePath || doesLetsEncryptDataPathExists || doesGreenlockConfigDir;

if (isStagingServer && doesAnyConfigFileExists) {
  die(`Can't have .sslize.json in home directory and/or letsencrypt folder when using staging server`);
}

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

  sslize.json...............exists? ${doesSslizeJsonDatabasePath ? "YES" : "NO"}
  greenlock config file.....exists? ${greenlockConfigDir ? "YES" : "NO"}
	letsencrypt data path.....exists? ${doesLetsEncryptDataPathExists ? "YES" : "NO"}
  
`);
log("-------------------------------------------");

debugger;
const greenlock = GreenLock.create({
  configDir: greenlockConfigDir,
  staging: isStagingServer,
  maintainerEmail: email,
  packageAgent: `${projectPackageJson.name}/${projectPackageJson.version}`,
  store: GreenLockStoreFs,
});

const registeredCertificates = loadRegistered();

function loadRegistered() {
  if (!doesLetsEncryptDataPathExists) {
    fs.writeFileSync(sslizeJsonDatabasePath, JSON.stringify({}));
  }

  const sslizeDatabaseContents = fs.readFileSync(sslizeJsonDatabasePath, "utf8");
  const sslizeDatabaseData = JSON.parse(sslizeDatabaseContents);
  return sslizeDatabaseData;
}

function saveRegistered() {
  fs.writeFileSync(sslizeJsonDatabasePath, JSON.stringify(registeredCertificates));
}

// Certdb
async function loadCertificates() {
  for (const domain of registeredCertificates) {
    try {
      const certs = await greenlock.get({ servername: domain });
      if (!global.certdb) global.certdb = {};

      const expires = certs._expiresAt;

      if (expires < new Date()) {
        registeredCertificates.splice(registeredCertificates.indexOf(domain), 1);
        return;
      }

      global.certdb[domain] = tls.createSecureContext({
        key: certs.privkey,
        cert: certs.cert + certs.chain,
      });
    } catch (err) {
      log(err);
      return;
    }
  }
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

      debugger;
      greenlock.add({ subject: host }).then(function (certs) {
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
              debugger;
              die(err);
            }
          );
        }
      },
    },
    async function (req, res) {
      log(`Received SECURE request ${req.headers.host}${req.url}`);
      transferRequestToAnotherServer(req, res, destinationServer);
    }
  )
  .listen(443);

http
  .createServer(async function (req, res) {
    log(`Received PLAIN request ${req.headers.host}${req.url}`);
    transferRequestToAnotherServer(req, res, destinationServer);
  })
  .listen(80);

function transferRequestToAnotherServer(req, res, anotherHttpServer) {
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

  // Registered hosts
  if (registeredCertificates.includes(host)) {
    log(`Host registered: ${req.headers.host}${req.url}`);
    proxy.web(req, res, { target: anotherHttpServer });
    return;
  }

  // Loopback check response - used to check domain before asking acme to generate ssl
  if (req.headers?.sslizetoken === sslizetoken) {
    res.write(sslizetoken);
    res.statusCode = 200;
    res.end();
  } else {
    res.statusCode = 500;
    res.end();
  }
}
