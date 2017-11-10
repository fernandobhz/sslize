#! /usr/bin/env node

if (process.argv.length != 5) {
	console.log('Usage: sslize email protocol://host:port productionServer(true|false)');
	console.log(' eg: sslize john@example.com http://localhost:8080 false');
	return;
}

var greenlock = require('greenlock');

var email = process.argv[2];
var destination = process.argv[3];
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
console.log(`

Redirection to https ${req.headers.host}${req.url}

`);
			res.send(`
				<script>
					location = 'https://' + location.hostname + location.pathname + location.hash;
				</script>
			`);
		}

	});
});



var register = function(req, res) {
	var host = req.headers.host;

	le.register({"domains": [host], "email": email, "agreeTos": true}).then(function (certs) {
		console.log('');
		console.log('Successfully registered ssls certs');
		console.log('');

		proxy.register(host, destination, {
			key: certs.privkey
			, cert: certs.cert
			, ca: certs.chain
		});

		res.writeHead(302, {'Location': req.url});
		res.end();
	}, function (err) {
		console.log('');
		console.log(err);
		console.log('');

		res.statusCode = 500;
		res.send(err.message);
		res.end;
	});
}

