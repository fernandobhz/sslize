#! /usr/bin/env node

// OPTIONAL: Setup your proxy but disable the X-Forwarded-For header
var proxy = require('redbird')({port: 80, xfwd: false});

proxy.notFound( function(req, res){
	proxy.register(req.headers.host, `http://${req.headers.host}:8080`);
	res.writeHead(302, {'Location': req.url});
	res.end();
});
