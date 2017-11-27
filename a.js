var greenlock = require('greenlock');
var tls = require('tls');
var httpolyglot = require('httpolyglot');

var le = greenlock.create({ server: greenlock.productionServerUrl });
le.check( {"domains": ["www.maisgps.com"]} ).then(function(certs) { 
	var ctx = tls.createSecureContext({
		key: certs.privkey
		, cert: certs.cert
		, ca: certs.chain
	}).context;
	console.log(ctx);
	
	httpolyglot.createServer({ 
		SNICallback: function (domain, cb) {
			console.log(domain); 
			cb(null, ctx);
		}
	}, function(req, res) { 
		res.write('ok'); 
		res.end();
	}).listen(443);		
} );


 


