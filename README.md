# SSLize
 
Automatic reverse proxy with let's encrypt.  
All requests received will be create a reverse proxy to an regular http server
SSL will be generated with let's encrypt for each host in requests.
This is very useful to put that app in front an web server that only has support for http

# Install   
	npm install -g sslize

# Usage  
  	sslize email protocol://host:port productionServer(true|false)
  
# Example
	sslize john@example.com http://destination-server.com:8080 false

This command will start a webserver on port 80 and 443 to receive the incoming connection then register the ssl if necessary then connect it to the destination, in our case http://destination-server.com:8080, but it could be another webserver as well.

# Production
	sslize john@example.com http://destination-server.com:8080 true
	
Only use the productionServer only when you have sure that will work, first test with staging server, setting the last argument to false

# References

https://www.npmjs.com/package/greenlock

https://git.rootprojects.org/root/greenlock.js.git

https://git.rootprojects.org/root/greenlock.js/issues/29

https://git.rootprojects.org/root/greenlock-express.js

https://git.rootprojects.org/root/greenlock-express.js/src/branch/master/examples

https://github.com/fernandobhz/sslize/blob/00580e97ac2cd6402ba912d915ca975fbc33eb73/sslize.js

https://git.rootprojects.org/root/greenlock-express.js/src/branch/master/examples/http-proxy/server.js

# Credits
  
[https://www.linkedin.com/in/fernandoreisguimaraes/](https://www.linkedin.com/in/fernandoreisguimaraes/)  

# Donate

[![paypaldonate](https://www.paypalobjects.com/pt_BR/BR/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RNDJKX9J6TBRW)

