var express = require('express');
var bodyParser = require('body-parser');
var basicAuth = require('basic-auth-connect');
var https = require('https');
var http = require('http');
var fs = require('fs');
var url = require('url');

var MongoClient = require('mongodb').MongoClient;

var ROOT_DIR = "./html";

var auth = basicAuth(function(user, pass) {
	return ((user === 'cs360') && (pass === 'test'));
});

var app = express();

var options = {
	host: '127.0.0.1',
	key: fs.readFileSync('ssl/server.key'),
	cert: fs.readFileSync('ssl/server.crt')
};

app.use(bodyParser());
app.use('/', express.static(ROOT_DIR, {maxAge: 60*60*1000}));

http.createServer(app).listen(80);
https.createServer(options, app).listen(443);

app.get('/getcity', function(req, res) {
	console.log("In getcity route");
	var urlObj = url.parse(req.url, true, false);
		
	// Read city data file
	fs.readFile(ROOT_DIR + "/cities.dat.txt", function(err, data) {
		// Send an error response if failed to read city data file
		if(err) {
			console.log("Failed to get file: cities.data.txt");

			res.writeHead(500);
			res.end(JSON.stringify(err));

			return;
		}

		// Go through each city in the city data file
		var cities = new Array();
		var cityList = data.toString().split('\n');
		for(var i in cityList) {
			var city = cityList[i];

			// Checks a nonempty city string
			if(city != "") {
				// If the query 'q' is a prefix substring of the city, adds the city to the suggested list of cities
				if(urlObj.query.q != null && city.toLowerCase().indexOf(urlObj.query.q.toLowerCase()) != 0) {
					continue;
				}

				cities.push({ city: city });
			}
		}

		// Sends the list of suggested city
		res.writeHead(200);
		res.end(JSON.stringify(cities));
	});
});

app.get('/comment', function(req, res) {
	console.log("In comment route");

	// Connects to the weather database and gets the list of comments from the database
	MongoClient.connect("mongodb://localhost/weather", function(err, db) {
		if(err) {
			console.log("Failed to connect to the weather database");

			res.writeHead(500);
			res.end(JSON.stringify(err));

			return;
		}

		db.collection("comments", function(err, comments) {
			if(err) {
				console.log("Failed to get comments collection from weather database");

				res.writeHead(500);
				res.end(JSON.stringify(err));

				return;
			}

			// Sends the list of comments from the weather database as a response
			comments.find(function(err, items) {
				if(err) {
					console.log("Failed to get comments from the comments collection in the weather database");

					res.writeHead(500);
					res.end(JSON.stringify(err));

					return;
				}

				items.toArray(function(err, itemArr) {
					if(err) {
						console.log("Failed to convert the list of comments to an array");
								
						res.writeHead(500);
						res.end(JSON.stringify(err));

						return;
					}

					console.log("Document Array: ");
					console.log(itemArr);

					res.json(itemArr);
				});
			});
		});
	});
});

app.post('/comment', auth, function(req, res) {
	/*console.log("In POST comment route");
	console.log(req.body);

	console.log("Remote User");
	console.log(req.remoteUser);

	console.log("Name: " + req.body.Name);
	console.log("Comment: " + req.body.Comment);*/

	// Connects to the weather database and adds the comment object to the database
	MongoClient.connect("mongodb://localhost/weather", function(err, db) {
		if(err) {
			console.log("Failed to connect to the weather database");
			throw err;
		}

		db.collection('comments').insert(req.body, function(err, records) {
			if(err) {
				console.log("Failed to add comment to the weather database");
				throw err;
			}

			//console.log("Record added as " + records[0]._id);

			// Sends a success response
			res.status(200);
			res.end();
		});
	});
});
