const express = require("express")
const { Tracer } = require('zipkin');
const { BatchRecorder } = require('zipkin');
const { HttpLogger } = require('zipkin-transport-http');
const CLSContext = require('zipkin-context-cls');
const fetch = require('node-fetch');
const wrapFetch = require('zipkin-instrumentation-fetch');
const zipkinMiddleware = require('zipkin-instrumentation-express').expressMiddleware;

const app = express()
const ctxImpl = new CLSContext();

const recorder = new BatchRecorder({
  logger: new HttpLogger({
    endpoint: `http://zipkin-collector.dev.rakenapp.com/api/v1/spans`
  })
});

const tracer = new Tracer({ ctxImpl, recorder });

const port = process.env.SNR_PORT || 3000;
const upstream = process.env.SNR_UPSTREAM || "https://jsonplaceholder.typicode.com/todos/1";
const label = process.env.SNR_LABEL || "unknown";
const debug = process.env.SNR_DEBUG || false;

var logDebug = function(message) {
  if(logDebug) {
    console.log(`${label}: ${message}`);
  }
}

var staticOptions = {
  dotfiles: 'ignore',
  etag: true,
  extensions: ['html'],
  //maxAge: '1d',
  redirect: false
}

app.use(express.static('html', staticOptions));

app.use(zipkinMiddleware({
  tracer,
  serviceName: label
}));

const zipkinFetch = wrapFetch(fetch, {
  tracer,
  serviceName: upstream
});

app.get('/api', (req, res) => {
  // Handle the HTTP Request
  // We want to make a request to the upstream

  //console.log(req.headers);
  //console.log(req.headers["x-failpercent"]);

  var options = {};

  logDebug("Checking the Failure header")
  if(req.headers["x-failpercent"]) {
    options.headers = {};
    options.headers["x-failpercent"] = req.headers["x-failpercent"]

    var failPercent = parseInt(req.headers["x-failpercent"]);
    var chance = Math.random() * 100;
    //console.log(`chance is ${chance}`);
    logDebug(`Failure rate is ${failPercent} and I rolled a ${chance}`)
    if(chance < failPercent) {
      logDebug(`${label} had a random failure`)
      res.statusCode = 500;
      res.statusMessage = `${label} had a random failure`;
      res.end();
      return;
    }
  }

  logDebug("Making the fetch")
  zipkinFetch(upstream, options)
    .then(upstreamResponse => {
      logDebug("Processing the response")
      var annotatedResponse = {};
      annotatedResponse.label = label;

      if(upstreamResponse.status != 200) {
        annotatedResponse.failed = true;
      }

      //console.log("upstream.upstream set to: ", body.upstream);
      annotatedResponse.upstream = {};
      annotatedResponse.upstream.server = upstream;
      annotatedResponse.upstream.status = upstreamResponse.status;
      annotatedResponse.upstream.statusText = upstreamResponse.statusText;

      upstreamResponse.json().then(json =>{
        logDebug("Reading the body JSON")

        if(json.failed) {
          annotatedResponse.failed = true;
        }
        //console.log("setting label");
        annotatedResponse.upstream.label = json.label;
        //console.log("upstream.label set to: ", body.upstream);
        annotatedResponse.upstream.upstream = json.upstream;

        if(! annotatedResponse.failed) {
          annotatedResponse.content = json.content ? json.content : json;
        }

        res.end(JSON.stringify(annotatedResponse));
        logDebug("Writing my response")
      }).catch(err => {
        annotatedResponse.upstream.error = err;
        res.end(JSON.stringify(annotatedResponse));
      });
    })
    .catch(err => {
      console.error(err);
      res.statusCode = 500;
      res.statusMessage = `${label} failed`;
      res.content = {};
      res.end(err);
    });
});


//const server = http.createServer(handler);
//server.listen(port);

const server = app.listen(port);
