#! /usr/bin/env node
// Strict-Transport-Security: max-age=15768000 ; includeSubDomains

// INITIAL CHECKING
if (process.argv.length < 5) {
    console.log('Usage: sslize email protocol://host:port productionServer(true|false|force|root)');
    console.log(' eg: sslize john@example.com http://localhost:8080 false');
    console.log(process.argv);
    process.exit(1);
}

// REQUIRES
const home = require('home')();
const httpProxy = require('http-proxy');
const greenlock = require('greenlock').create({ packageAgent: 'sslize/1.3.55' });
const request = require('request');
const https = require('https');
const path = require('path');
const http = require('http');
const tls = require('tls');
const fs = require('fs');

// INPUT ARGS
const email = process.argv[2];
const destination = process.argv[3];
const productionServerUrl = 'https://acme-v02.api.letsencrypt.org/directory';
const stagingServerUrl = 'https://acme-staging-v02.api.letsencrypt.org/directory';

let server, force, root;

if (process.argv[4] === 'force') {
    server = productionServerUrl;
    force = true;
    root = false;
} else if (process.argv[4] === 'root') {
    server = productionServerUrl;
    root = true;
    force = false;
} else if (process.argv[4] === 'true') {
    server = productionServerUrl;
    force = false;
    root = false;
} else {
    server = stagingServerUrl;
    force = false;
    root = false;
}

console.log("ARGUMENTS RECEIVED");
console.log("-------------------------------------------");
console.log(process.argv);
console.log("-------------------------------------------");
console.log(`
PARSED: 
    email: ${email}
    destination: ${destination}
    server: ${server}
    force: ${force}
    root: ${root}
`);
console.log("-------------------------------------------");

// OBJECTS, REQUIRED
const proxy = httpProxy.createProxyServer({ xfwd: true });
const token = Math.random().toString().substring(2);

// REGISTERED
const fdb = path.join(home, '.sslize.json');
const registered = loadRegistered();

function loadRegistered() {
    if (!fs.existsSync(fdb)) fs.writeFileSync(fdb, JSON.stringify([]));
    const fcontent = fs.readFileSync(fdb);
    return JSON.parse(fcontent);
}

function saveRegistered() {
    fs.writeFileSync(fdb, JSON.stringify(registered));
}

// CERTDB
async function loadCertificates() {
    for (const domain of registered) {
        try {
            const certs = await greenlock.check({ domains: [domain] });
            if (!global.certdb) global.certdb = {};

            const expires = certs._expiresAt;

            if (expires < new Date()) {
                registered.splice(registered.indexOf(domain), 1);
                return;
            }

            global.certdb[domain] = tls.createSecureContext({
                key: certs.privkey,
                cert: certs.cert + certs.chain
            });
        } catch (err) {
            console.log(err);
            return;
        }
    }
}

// SSL REGISTRATION
async function registerSSL(host, callback, error) {
    try {
        const response = await request({ url: `http://${host}`, headers: { 'token': token } });
        if (response !== token) {
            error(`CHECKING TOKEN: TOKEN VERIFY ERROR - UNKNOWN REQUEST`);
        } else {
            console.log(`CHECKING TOKEN: SUCCESS`);
            console.log(`ASK-LETSENCRYPT ${host}`);

            const certs = await greenlock.register({
                domains: [host],
                email: email,
                agreeTos: true,
                challengeType: 'http-01'
            });

            console.log('Successfully registered SSL cert');

            if (!registered.includes(host)) {
                registered.unshift(host);
                saveRegistered();
            }

            if (!global.certdb) global.certdb = {};

            global.certdb[host] = tls.createSecureContext({
                key: certs.privkey,
                cert: certs.cert + certs.chain
            });

            callback();
        }
    } catch (err) {
        console.log(err);
        error(err);
    }
}

// STARTING HTTP AND HTTPS SERVERS
console.log(`STARTING: ${registered}`);

https.createServer({
    SNICallback: function (domain, cb) {
        if (global.certdb && global.certdb[domain]) {
            cb(null, global.certdb[domain]);
        } else {
            registerSSL(domain,
                function () {
                    cb(null, global.certdb[domain]);
                }, function (err) {
                    console.log(err);
                    cb();
                }
            );
        }
    }
}, async function (req, res) {
    console.log(`Received SECURE request ${req.headers.host}${req.url}`);
    greenlock.middleware(req, res, function () {
        httpHttps(req, res);
    });
}).listen(443);

http.createServer(async function (req, res) {
    console.log(`Received PLAIN request ${req.headers.host}${req.url}`);
    greenlock.middleware(req, res, function () {
        httpHttps(req, res);
    });
}).listen(80);

// httpHttps application
function httpHttps(req, res) {
    const skip = ['localhost', '127.0.0.1'];
    const host = req.headers.host;

    if (!host) {
        const errMessage = `HOST IS NOT VALID: '${host}'`;
        console.log(errMessage);
        res.statusCode = 500;
        res.write(errMessage);
        res.end();
    } else if (!isNaN(host[0])) {
        console.log(`IP: ${req.headers.host}${req.url}`);
        proxy.web(req, res, { target: destination });
    } else if (skip.includes(host)) {
        console.log(`SKIPPED: ${req.headers.host}${req.url}`);
        proxy.web(req, res, { target: destination });
    } else if (registered.includes(host)) {
        console.log(`REGISTERED: ${req.headers.host}${req.url}`);
        if (force && !req.socket.encrypted) {
            res.writeHead(302, { 'Location': `https://${req.headers.host}${req.url}` });
            res.end();
        } else if (root && !req.socket.encrypted && req.url == '/') {
            res.writeHead(302, { 'Location': `https://${req.headers.host}` });
            res.end();
        } else {
            proxy.web(req, res, { target: destination });
        }
    } else if (req.headers.token) {
        if (req.headers.token == token) {
            res.write(token);
            res.statusCode = 200;
            res.end();
        } else {
            res.statusCode = 500;
            res.end();
        }
    } else {
        console.log(`UN-REGISTERED: ${req.headers.host}${req.url}`);
        console.log(`CHECKING TOKEN ON LOOPBACK CALL`);

        registerSSL(host,
            function () {
                if (force && !req.socket.encrypted) {
                    res.writeHead(302, { 'Location': `https://${req.headers.host}${req.url}` });
                    res.end();
                } else if (root && !req.socket.encrypted && req.url == '/') {
                    res.writeHead(302, { 'Location': `https://${req.headers.host}` });
                    res.end();
                } else {
                    proxy.web(req, res, { target: destination });
                }
            }, function (err) {
                console.log(err);
                res.statusCode = 500;
                res.end();
            }
        );
    }
}
