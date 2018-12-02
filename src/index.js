var http = require("http")
var request = require("request")

const port = process.env.SNR_PORT || 3000;
const upstream = process.env.SNR_UPSTREAM || "https://jsonplaceholder.typicode.com/todos/1";
const label = process.env.SNR_LABEL || "unknown";

const handler = (req, res) => {
  // Handle the HTTP Request
  // We want to make a request to the upstream

  //console.log(req.headers);
  //console.log(req.headers["x-failpercent"]);

  if(req.headers["x-failpercent"]) {
    var failPercent = parseInt(req.headers["x-failpercent"]);
    var chance = Math.random() * 100;
    //console.log(`chance is ${chance}`);
    if(chance < failPercent) {
      res.statusCode = 500;
      res.statusMessage = `${label} failed`;
      res.end();
      return;
    }
  }

  request(upstream, function(error, response, body) {
    //console.log("Error: ", error);
    //console.log("Response: ", response && response.statusCode);
    //console.log("Body: ", body)

    var annotatedResponse = {};
    annotatedResponse.label = label;
    annotatedResponse.upstream = {};
    annotatedResponse.upstream.server = upstream;
    annotatedResponse.upstream.responseCode = response.statusCode;
    annotatedResponse.upstream.error = error;
    annotatedResponse.upstream.body = body == null ? "" : JSON.parse(body);
    res.end(JSON.stringify(annotatedResponse));
  });
}

const server = http.createServer(handler);
server.listen(port);
