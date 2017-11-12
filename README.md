# SSLize
Automatic reverse proxy with let's encrypt.  
All requests received will be create a reverse proxy to port 80.  
SSL will be generated with let's encrypt for each host in requests.  
  
This is very usefull to put that app in front an web server that only server http.  
For example an apache ou iis.  

#Install  
  
	npm install -g sslize

#Usage  
  	
	eg: sslize john@example.com http://localhost:8080 false

That command will redirect all http on port 80 to port 8080 AND create a server on 443 with lets encrypt ssl then proxy request to port 8080.

