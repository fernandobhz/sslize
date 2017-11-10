#! /usr/bin/env node

if (process.argv.length != 5) {
	console.log('Usage: sslize email protocol://host:port productionServer(true|false|force)');
	console.log(' eg: sslize john@example.com http://localhost:8080 false');
	return;
}

var registered = [];
var skip = ['localhost', '127.0.0.1'];
var httpolyglot = require('httpolyglot');
var httpProxy = require('http-proxy');
var greenlock = require('greenlock');
var http = require('http');
var path = require('path');


var email = process.argv[2];

var destination = process.argv[3];

if ( process.argv[4] == 'force' ) {
	var production = true;
	var force = true;
} else if ( process.argv[4] == 'true') {
	var production = true;
	var force = false;
} else {
	var production = false;
	var force = false;
}


var proxy = httpProxy.createProxyServer({xfwd: false});
var leStaging = greenlock.create({ server: greenlock.stagingServerUrl });
var leProduction = greenlock.create({ server: greenlock.productionServerUrl });
var leStagingMiddleware = leStaging.middleware();
var leProductionMiddleware = leProduction.middleware();


http.createServer(async function(req, res) {
	console.log(`Received request ${req.headers.host}${req.url}`);

	leProductionMiddleware(req, res, function() {
		httpHttps(req, res);
	});

}).listen(80);


var httpHttps = function(req, res) {
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
		if ( force ) {
			res.writeHead(302, {'Location': `https://${req.headers.host}${req.url}`});
			res.end();
		} else {
			proxy.web(req, res, { target: destination });
		}
	} else {
		console.log(`UN-REGISTERED: ${req.headers.host}${req.url}`);
		registered.unshift(host);

		console.log(`ASK-LETSENCRYPT ${registered}`);
		leStaging.register({"domains": registered, "email": email, "agreeTos": true}).then(function(certs) {
			console.log('Successfully TESTED ssls certs');

			if ( ! production ) {
				https(req, res, certs);
			} else {
				leProduction.register({"domains": registered, "email": email, "agreeTos": true}).then(function(certs) {
					console.log('Successfully REGISTERED ssls certs');
				
					https(req, res, certs);
				}, function(err) {
					console.log('Error REGISTERING ssl cert');
					console.log(err);

					res.statusCode = 500;
					res.write(err.message);
					res.end();
				});
			}
		}, function(err) {
			console.log('Error TESTING ssl cert');
			console.log(err);

			res.statusCode = 500;
			res.write(err.message);
			res.end();
		});
	}
}

var polyglot;

function https(req, res, certs) {
	if ( polyglot ) polyglot.close();

	polyglot = httpolyglot.createServer({
	  key: certs.privkey
	  , cert: certs.cert
	  , ca: certs.chain
	}, function(req, res) {
		if ( ! registered.includes(req.headers.host) ) {
			httpHttps(req, res);
		} else {
			proxy.web(req, res, { target: destination });
		}
	});
	polyglot.listen(443);

	if ( force ) {
		res.writeHead(302, {'Location': `https://${req.headers.host}${req.url}`});
		res.end();
	} else {
		proxy.web(req, res, { target: destination });
	}
}