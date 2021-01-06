/*
 *  Server-related tasks
 */

//Dependicies
const http = require('http');
const https = require('https')
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers')
const helpers = require('./helpers');
const path = require('path');
const util = require('util');
const debug = util.debuglog('server');

// Instantiate the server module object
const server = {};

// Instantiate the HTTP server
server.httpServer = http.createServer(function (req, res) {
    server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, function (req, res) {
    server.unifiedServer(req, res);
});

// All the server logic for both the protocol types
server.unifiedServer = function (req, res) {
    // Get the URL and parse it
    const parsedURL = url.parse(req.url, true);

    // Get the path
    const path = parsedURL.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object
    const queryStringObject = parsedURL.query;

    // Get the rquest method
    const method = req.method.toLowerCase();

    // Get the headers as an object
    const headers = req.headers;

    // Get the payload if there is any
    const decoder = new StringDecoder('utf-8');
    var buffer = "";
    req.on('data', function (data) {
        buffer += decoder.write(data)
    });

    req.on('end', function () {
        buffer += decoder.end();

        // Choose the handler this request should go to. If one is not found, then return status code 400
        const chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : server.router.notFound;

        // Construnt the data object to send to the handler
        const data = {
            'headers': headers,
            'method': method,
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'payload': helpers.parseJSONToObject(buffer)
        };

        // Route the request to the handler specified in the router
        chosenHandler(data, function (statusCode, payload) {
            // Use the status code called back by the handler, if not then default to 200
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200;

            // Use the payload called back by the handler, if not then default to an empty object;
            payload = typeof (payload) == 'object' ? payload : {};

            // Convert the payload to a String
            const payloadString = JSON.stringify(payload);

            // Return the response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // If the respose is 200, print green otherwise print red
            if(statusCode == 200) {
                debug('\x1b[32m%s\x1b[0m',method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
            } else {
                debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' + statusCode);
            }
        });
    });
}

// Define a router
server.router = {
    '': handlers.index,
    'account/create': handlers.accountCreate,
    'account/edit': handlers.accountEdit,
    'account/delted': handlers.accountDeleted,
    'session/create': handlers.sessionCreate,
    'session/delete': handlers.sessionDeleted,
    'checks/all': handlers.checksList,
    'checks/create': handlers.checksCreate,
    'checks/edit': handlers.checksEdit,
    'ping': handlers.ping,
    'api/notFound': handlers.notFound,
    'api/users': handlers.users,
    'api/tokens': handlers.tokens,
    'api/checks': handlers.checks
}

// Init server
server.init = function() {
    // Start the HTTP server
    server.httpServer.listen(config.httpPort, function () {
        console.log('\x1b[35m%s\x1b[0m', "HTTP server is listening on port " + config.httpPort)
    });

    // Start the HTTPS server
    server.httpsServer.listen(config.httpsPort, function () {
        console.log('\x1b[36m%s\x1b[0m', "HTTPS server is listening on port " + config.httpsPort)
    });
}

// Export the server
module.exports = server;