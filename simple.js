var http = require('http');
var fs   = require('fs');
var url  = require('url');

var MongoClient = require('mongodb').MongoClient;

var ROOT_DIR = "html";

http.createServer(function(req, res) {
	var urlObj = url.parse(req.url, true, false);

	if(urlObj.pathname === "/getcity") {
		// In /getcity route
		
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

		return;

	} else if(urlObj.pathname === "/comment") {
		console.log("In /comment route");

		// Checks request method
		if(req.method === "POST") {
			console.log("In POST /comment route");

			// Gets the JSON string data and converts it to an object
			var jsonData = "";
			req.on('data', function(chunk) {
				jsonData += chunk;
			});
			req.on('end', function() {
				var reqObj = JSON.parse(jsonData);
				console.log(reqObj);
				console.log("Name: " + reqObj.Name);
				console.log("Comment: " + reqObj.Comment);

				// Connects to the weather database and adds the comment object to the database
				MongoClient.connect("mongodb://localhost/weather", function(err, db) {
					if(err) {
						console.log("Failed to connect to the weather database");
						throw err;
					}

					db.collection('comments').insert(reqObj, function(err, records) {
						if(err) {
							console.log("Failed to add comment to the weather database");
							throw err;
						}

						console.log("Record added as " + records[0]._id);
					});
				});

				// Sends a success response
				res.writeHead(200);
				res.end("");
			});
		} else if(req.method === "GET") {
			console.log("In GET /comment route");

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

							res.writeHead(200);
							res.end(JSON.stringify(itemArr));
						});
					});
				});
			});
		}

		return;
	}

	// This is the default route

	// Reads and sends the static file requested
	fs.readFile(ROOT_DIR + urlObj.pathname, function(err, data) {
		if(err) {
			res.writeHead(404);
			res.end(JSON.stringify(err));
			return;
		}

		res.writeHead(200);
		res.end(data);
	});
}).listen(80);
