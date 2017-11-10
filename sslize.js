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
var le = greenlock.create({ server: server });
var leMiddleware = le.middleware();


http.createServer(async function(req, res) {
	var host = req.headers.host;

	if ( registered.includes(host) ) {
		proxy.web(req, res, { target: destination });
	} else {
		console.log(''); console.log(''); console.log(''); console.log('');
		console.log(`Received request ${req.headers.host}${req.url}`);
		console.log(''); console.log(''); console.log(''); console.log('');

		leMiddleware(req, res, function() {
			if ( ! registered.includes(host) ) {
				console.log(''); console.log(''); console.log(''); console.log('');
				console.log(`Registering ${host} asking lets encrypt`);
				console.log(''); console.log(''); console.log(''); console.log('');

				registered.push(host);

				le.register({"domains": [host], "email": email, "agreeTos": true}).then(function(certs) {
					console.log(''); console.log(''); console.log(''); console.log('');
					console.log('Successfully registered ssls certs');
					console.log(''); console.log(''); console.log(''); console.log('');					
					
					httpolyglot.createServer({
					  key: certs.privkey
					  , cert: certs.cert
					  , ca: certs.chain
					}, function(req, res) {
						proxy.web(req, res, { target: destination });
					}).listen(8443);
					
					httpProxy.createServer({
						target: destination
						ssl: {
							key: certs.privkey
							, cert: certs.cert
							, ca: certs.chain
						}
					}).listen(443);

					proxy.web(req, res, { target: destination });
				}, function(err) {
					console.log(''); console.log(''); console.log(''); console.log('');
					console.log(err);
					console.log(''); console.log(''); console.log(''); console.log('');

					res.statusCode = 500;
					res.write(err.message);
					res.end;
				});
			} else {
				console.log(''); console.log(''); console.log(''); console.log('');
				console.log(`Looping back`);
				console.log(''); console.log(''); console.log(''); console.log('');

				setTimeout(function() {
					console.log(''); console.log(''); console.log(''); console.log('');
					console.log(`Looped back`);
					console.log(''); console.log(''); console.log(''); console.log('');

					res.writeHead(302, {'Location': req.url});
					res.end();
				}, 10000);

			}
		});
	}
});

