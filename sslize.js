#! /usr/bin/env node

var proxy = require('redbird')({port: 80, xfwd: false});

proxy.notFound( function(req, res){
	proxy.register(req.headers.host, `http://${req.headers.host}:8080`, {
		ssl: {
			letsencrypt: {
				email: 'fernandobhz@gmail.com', // Domain owner/admin email
				production: false
			}
		}
	});

	res.writeHead(302, {'Location': req.url});
	res.end();
});
