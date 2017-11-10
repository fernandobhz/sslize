#! /usr/bin/env node

if (process.argv.length != 5) {
	console.log('Usage: sslize email protocol://host:port productionServer(true|false)');
	console.log(' eg: sslize john@example.com http://localhost:8080 false');
	return;
}

var registered = ['localhost', '127.0.0.1'];
var httpolyglot = require('httpolyglot');
var httpProxy = require('http-proxy');
var greenlock = require('greenlock');
var http = require('http');
var path = require('path');


var email = process.argv[2];
var destination = process.argv[3];
var server = process.argv[4] == 'true' ? greenlock.productionServerUrl  :greenlock.stagingServerUrl;


var proxy = httpProxy.createProxyServer({xfwd: false});
var le = greenlock.create({ server: server });
var leMiddleware = le.middleware();

http.createServer(async function(req, res) {
	var host = req.headers.host;
	console.log(`Received request ${req.headers.host}${req.url}`);

	leMiddleware(req, res, function() {
		
		if ( registered.includes(host) ) {
			console.log(`REGISTERED: ${req.headers.host}${req.url}`);		
			proxy.web(req, res, { target: destination });
		} else {
			console.log(`UN-REGISTERED: ${req.headers.host}${req.url}`);		

			leMiddleware(req, res, function() {
				console.log(`ASK-LETSENCRYPT ${host}`);
				registered.push(host);

				le.register({"domains": [host], "email": email, "agreeTos": true}).then(function(certs) {
					console.log('Successfully registered ssls certs');
					
					httpolyglot.createServer({
					  key: certs.privkey
					  , cert: certs.cert
					  , ca: certs.chain
					}, function(req, res) {
						proxy.web(req, res, { target: destination });
					}).listen(8443);
					
					httpProxy.createServer({
						target: destination
						, ssl: {
							key: certs.privkey
							, cert: certs.cert
							, ca: certs.chain
						}
					}).listen(443);

					proxy.web(req, res, { target: destination });
				}, function(err) {
					console.log(err);

					res.statusCode = 500;
					res.write(err.message);
					res.end();
				});
				
			});
		
		}
	});
}).listen(80);

