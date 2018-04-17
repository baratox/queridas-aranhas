'use strict';

const _ = require('lodash');
const path = require('path');
const request = require('request-promise-native');
const RequestErrors = require('request-promise-native/errors');
const S = require('string');

const crawler = require('./crawler.js');
const { writeText } = require('./json.js');

const DEBUG = process.env.DEBUG == 1 || false;

module.exports = crawler.trick('request', function(options, resolution) {
    if (typeof options === 'string' || options instanceof String) {
        options = { url: options };
    }

    let context = this;
    function repeatRequestIfNextPage(response) {
        var success = response && /^2/.test('' + response.statusCode);
        // If headers has a next page link, request it too using same crawling options.
        if (success && response.headers.link) {
            var links = response.headers.link.split(",")
                            .filter((link) => link.match(/rel="next"/));
            if (links.length > 0) {
                var next = new RegExp(/<(.*)>/).exec(links[0])[1];
                return [
                    response,
                    // Repeat this 'request' step, only changing the url
                    context.step.moonwalk({ 'url': next, 'baseUrl': null }),
                ]
            }
        }

        return response;
    }

    if (typeof options.url === 'string' || options.url instanceof String) {
        var req = makeRequest(context, options)
        if (options.requestNextPage) {
            return req.then(repeatRequestIfNextPage)
        } else {
            return req
        }

    } else if (Array.isArray(options.url)) {
        var promises = [];
        options.url.forEach((url) => {
            var urlRequest = Object.assign({}, options, { 'url': url })

            var req = makeRequest(context, urlRequest)
            if (options.requestNextPage) {
                req = req.then(repeatRequestIfNextPage)
            }

            promises.push(req)
        })
        return promises;

    } else {
        console.log("Invalid Options:", JSON.stringify(options));
        throw Error("Missing request URL.");
    }
}, {
    'requestNextPage': true,
    'saveResponseToContext': true,
    'saveResponseToDisk': true,
    'resolveWithFullResponse': true,
    'request': function(options) {
        console.info("    HTTP GET", options.url, options.qs ? '? ' + JSON.stringify(options.qs) : '');
        return request(options);
    },
});

function dumpResponse(request, response) {
    // Save the raw response to the disk
    var filename = S(request.url).chompLeft('https://')
        .chompLeft('http://').replaceAll(/[\?\/:=]/g, '_');

    filename = path.join('/usr/queridas/data/responses/', filename.s);

    writeText(response.body, filename);

    if (DEBUG) { console.debug("Reponse written to", filename); }
}

function saveResponseToContext(context, response) {
    var root = context.root;
    if (root.responses === undefined) {
        root.responses = new Map()
    }

    if (!root.responses.has(context.step.index)) {
        root.responses.set(context.step.index, [response])
    } else {
        root.responses.get(context.step.index).push(response)
    }
}

function makeRequest(context, options) {
    var request = options.request || request;

    request = request(options);

    if (options.saveResponseToContext) {
        request = request.then(response => {
            saveResponseToContext(context, response)
            return response
        })
    }

    if (options.saveResponseToDisk) {
        request = request.then(response => {
            dumpResponse(options, response)
            return response
        })
    }

    return request.catch(error => {
        context.error = error;

        // TODO If it's a temporary problem, retry.
        if (error instanceof RequestErrors.StatusCodeError) {
            console.error("Unsucessful request (status", error.response.statusCode + ") to",
                error.response.request.uri.href);
        } else if (error instanceof RequestErrors.RequestError) {
            console.error("Request to", error.response ? error.response.request.uri.href : '(?)',
                "failed with", error.message);
        } else {
            console.error("Request failed with", error);
        }

        return error;
    });
}
