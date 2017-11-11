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
var request = require('request');
var http = require('http');
var path = require('path');


var email = process.argv[2];

var destination = process.argv[3];

if ( process.argv[4] == 'force' ) {
	var server = greenlock.productionServerUrl;
	var force = true;
} else if ( process.argv[4] == 'true') {
	var server = greenlock.productionServerUrl;
	var force = false;
} else {
	var server = greenlock.stagingServerUrl;
	var force = false;
}


var proxy = httpProxy.createProxyServer({xfwd: false});
var le = greenlock.create({ server: server });
var leMiddleware = le.middleware();

var token = Math.random().toString().substring(2);

http.createServer(async function(req, res) {
	console.log(`Received request ${req.headers.host}${req.url}`);

	leMiddleware(req, res, function() {
		httpHttps(req, res);
	});

}).listen(80);


var httpHttps = function(req, res) {
	var host = req.headers.host
	
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
		
		request({url: `http://${req.headers.host}`, headers: {'token': token}}, function (err, response, body) {
			if ( err ) {
				console.log(`CHEKING TOKEN: REQUEST ERROR`);
				console.log(err);

				res.statusCode = 500;
				res.write(err.message);
				res.end();
			} else if ( body !== token  ) {
				console.log(`CHEKING TOKEN: TOKEN VERIFY ERROR - UNKNOW REQUEST`);
				console.log(response);
				console.log(body);

				//sem mensagem essa requisicao é desconhecida e pode ser maliciosa
				res.statusCode = 500;
				res.end();
			} else if ( body === token ) {
				console.log(`CHEKING TOKEN: SUCCESS`);
				registered.unshift(host);

				console.log(`ASK-LETSENCRYPT ${registered}`);
				le.register({"domains": registered, "email": email, "agreeTos": true}).then(
					function(certs) {
						https(req, res, certs);
					}, function(err) {
						console.log(err);

						res.statusCode = 500;
						res.write(err.message);
						res.end();
					}
				);
			} else {
				console.log('unreachable code was reach');
				res.write('unreachable code was reach');
				res.statusCode = 500;
				res.end();
			}
		});		
	}
}

var polyglot;

function https(req, res, certs) {
	console.log('Successfully registered ssls certs');

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

