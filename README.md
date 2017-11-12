# SSLize
 
Automatic reverse proxy with let's encrypt.  
All requests received will be create a reverse proxy to port 80.  
SSL will be generated with let's encrypt for each host in requests.  
  
This is very usefull to put that app in front an web server that only server http.  
For example an apache ou iis.  

# Install  
  
	npm install -g sslize

# Usage  
  	sslize email protocol://host:port productionServer(true|false|force)
  
# Example
	sslize john@example.com http://localhost:8080 false

That command will redirect all http on port 80 to port 8080 AND create a server on 443 with lets encrypt ssl then proxy request to port 8080.  


# Production
	sslize john@example.com http://localhost:8080 true
	
Only use the productionServer only when you have sure that will work, first test with staging server, setting the last argument to false

# Credits
  
[www.fernandobhz.com.br](http://www.fernandobhz.com.br)  
[www.fernandobhz.com](http://www.fernandobhz.com)  
[fernandobhz.github.io](http://fernandobhz.github.io)  

# Donate

![https://www.paypalobjects.com/pt_BR/BR/i/btn/btn_donateCC_LG.gif](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=RNDJKX9J6TBRW)

