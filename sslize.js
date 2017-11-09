#! /usr/bin/env node

var proxy = require('winredbird')({
	port: 80
	, xfwd: false
	, 	ssl: {
			port: 443
			, http2: true
		}
	, letsencrypt: {
		path: __dirname + '/certs/'
		, port: 80
	}
});

var opts = {
	ssl: {
		letsencrypt: {
			path: __dirname + '/certs'
			, email: 'fernandobhz@gmail.com'
			, production: false
		}
	}
}

proxy.notFound( function(req, res){
	proxy.register(req.headers.host, `http://${req.headers.host}:8080`, opts);
	res.writeHead(302, {'Location': req.url});
	res.end();
});

