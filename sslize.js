#! /usr/bin/env node

if (process.argv.length != 5) {
	console.log('Usage: sslize email protocol://host:port productionServer(true|false)');
	console.log(' eg: sslize john@example.com http://localhost:8080 false');
	return;
}

var greenlock = require('greenlock');
var path = require('path');

var email = process.argv[2];
var destination = process.argv[3];
var production = process.argv[4] == 'true' ? true : false;
var server = process.argv[4] == 'true' ? greenlock.productionServerUrl  :greenlock.stagingServerUrl;



var le = greenlock.create({ server: server });
var leMiddleware = le.middleware();

var proxy = require('redbird')({
	port: 80
	, xfwd: false
	, ssl: {
		port: 443
		, http2: true
	}
	, letsencrypt: {
		path: path.join(require('home')(), 'letsencrypt')
	}
});



var registered = ['localhost', '127.0.0.1'];

proxy.notFound(async function(req, res){
	var host = req.headers.host;
console.log(`

Received request ${req.headers.host}${req.url} > proxy.notfound

`);

	leMiddleware(req, res, function() {

		if ( ! registered.includes(host) ) {
console.log(`

Registering ${host}

`);
			registered.push(host);
			register(req, res);
		} else {
			//that code will never be hit
			console.log('\n\n\n\n\n\n\n\n\n\n that code never shoud be hit \n\n\n\n\n\n\n\');
		}
	});
});



var register = function(req, res) {
	var host = req.headers.host;

	le.register({"domains": [host], "email": email, "agreeTos": true}).then(function (certs) {
		console.log('');
		console.log('Successfully registered ssls certs');
		console.log('');

		proxy.register(host, destination,  {
			ssl: {
				letsencrypt: {
				  email: email
				  , production: production
				}
			}
		});

		res.writeHead(302, {'Location': req.url});
		res.end();
	}, function (err) {
		console.log('');
		console.log(err);
		console.log('');

		res.statusCode = 500;
		res.write(err.message);
		res.end;
	});
}

