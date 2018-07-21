#! /usr/bin/env node
// Strict-Transport-Security: max-age=15768000 ; includeSubDomains

// INITIAL CHEKING
if (process.argv.length != 5) {
	console.log('Usage: sslize email protocol://host:port productionServer(true|false|force|root)');
	console.log(' eg: sslize john@example.com http://localhost:8080 false');
	return;
}



// REQUIRES
var home = require('home')();
var httpProxy = require('http-proxy');
var greenlock = require('greenlock');
var request = require('request');
var https = require('https');
var path = require('path');
var http = require('http');
var tls = require('tls');
var fs = require('fs');


console.log("ARGUMENTS RECEIVED");
console.log("-------------------------------------------");
console.log(process.argv);
console.log("-------------------------------------------");

// INPUT ARGS
var email = process.argv[2];

var destination = process.argv[3];

if ( process.argv[4] == 'force' ) {
	var server = greenlock.productionServerUrl;
	var force = true;
	var root = false;
} else if ( process.argv[4] == 'root' ) {
	var server = greenlock.productionServerUrl;
	var root = true;
	var force = false;
} else if ( process.argv[4] == 'true') {
	var server = greenlock.productionServerUrl;
	var force = false;
	var root = false;
} else {
	var server = greenlock.stagingServerUrl;
	var force = false;
	var root = false;
}



// OBJECTS, REQUIRED
var proxy = httpProxy.createProxyServer({xfwd: false});
var le = greenlock.create({ server: server });
var leMiddleware = le.middleware();
var token = Math.random().toString().substring(2);



// REGISTERED
var fdb = path.join(home, '.sslize.json');
if ( ! fs.existsSync(fdb) ) fs.writeFileSync(fdb, JSON.stringify([]));

var fcontent = fs.readFileSync(fdb);
var registered = JSON.parse(fcontent);

registered.save = function() {
	fs.writeFileSync(fdb, JSON.stringify(registered));
}



// CERTDB
for (let domain of registered) {
	le.check( {"domains": [domain]} ).then(
		function(certs) {
			if ( ! global.certdb ) global.certdb = {};

			global.certdb[domain]  = tls.createSecureContext({
				key: certs.privkey
				, cert: certs.cert + certs.chain
			});
		}, function(err) {
			console.log(err);
			return;
		}
	);
}



// SSL REGISTRATION
var regssl = function(host, callback, error) {
	request({url: `http://${host}`, headers: {'token': token}}, function (err, response, body) {
		if ( err ) {
			error(`CHEKING TOKEN: REQUEST ERROR`);			
		} else if ( body !== token  ) {
			error(`CHEKING TOKEN: TOKEN VERIFY ERROR - UNKNOW REQUEST`);			
		} else if ( body === token ) {
			console.log(`CHEKING TOKEN: SUCCESS`);
			console.log(`ASK-LETSENCRYPT ${host}`);

			le.register({"domains": [host], "email": email, "agreeTos": true}).then(function(certs) {
				console.log('Successfully registered ssl cert');
				
				if ( ! registered.includes(host) ) {
					registered.unshift(host);
					registered.save();
				}

				if ( ! global.certdb ) global.certdb = {};

				global.certdb[host]  = tls.createSecureContext({
					key: certs.privkey
					, cert: certs.cert + certs.chain
				});

				callback();
			}, error);
		}
	});
}




// STARTING HTTP AND HTTPS SERVERS
console.log(`STARTING: ${registered}`);

https.createServer({
	SNICallback: function (domain, cb) {

		if ( global.certdb && global.certdb[domain] ) {
			cb(null, global.certdb[domain]);
		} else {
			regssl(domain, 
				function() {
					cb(null, global.certdb[domain]);
				}, function(err) {
					console.log(err);
					
					cb();
				}
			);
		}

	}
}, async function(req, res) {
	console.log(`Received SECURE request ${req.headers.host}${req.url}`);

	leMiddleware(req, res, function() {
		httpHttps(req, res);
	});
}).listen(443);


http.createServer(async function(req, res) {
	console.log(`Received PLAIN request ${req.headers.host}${req.url}`);

	leMiddleware(req, res, function() {
		httpHttps(req, res);
	});

}).listen(80);



// httpHttps application
var httpHttps = function(req, res) {
	var skip = ['localhost', '127.0.0.1'];
	var host = req.headers.host;

	if ( ! host ) {
		var errMessage = `HOST IS NOT VALID: '${host}'`;
		console.log(errMessage);
		res.statusCode = 500;
		res.write(errMessage);
		res.end();
	} else if ( ! isNaN(host[0]) ) {
		console.log(`IP: ${req.headers.host}${req.url}`);
		proxy.web(req, res, { target: destination });
	} else if ( skip.includes(host) ) {
		console.log(`SKIPPED: ${req.headers.host}${req.url}`);
		proxy.web(req, res, { target: destination });
	} else if ( registered.includes(host) ) {
		console.log(`REGISTERED: ${req.headers.host}${req.url}`);
		if ( force && ! req.socket.encrypted) {
			res.writeHead(302, {'Location': `https://${req.headers.host}${req.url}`});
			res.end();
		} else if ( root && ! req.socket.encrypted && req.url == '/') {
			res.writeHead(302, {'Location': `https://${req.headers.host}`});
			res.end();
		} else {
			proxy.web(req, res, { target: destination });
		}
	} else if ( req.headers.token ) {
		if ( req.headers.token == token ) {
			res.write(token);
			res.statusCode = 200;
			res.end();
		} else {
			res.statusCode = 500;
			res.end();
		}
	} else {
		console.log(`UN-REGISTERED: ${req.headers.host}${req.url}`);
		console.log(`CHEKING TOKEN ON LOOPBACK CALL`);

		regssl(host,
			function() {
				if ( force && ! req.socket.encrypted) {
					res.writeHead(302, {'Location': `https://${req.headers.host}${req.url}`});
					res.end();
				} else if ( root && ! req.socket.encrypted && req.url == '/' ) {
					res.writeHead(302, {'Location': `https://${req.headers.host}`});
					res.end();
				} else {
					proxy.web(req, res, { target: destination });
				}
			}, function(err) {
				console.log(err);

				res.statusCode = 500;
				res.end();
			}
		);

	}
}
