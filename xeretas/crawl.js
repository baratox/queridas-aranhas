const request = require('request-promise-native');
const S = require('string');

const scrape = require('../util/scrape');

const { writeText } = require('../util/json');
const path = require('path');


function dumpResponse(request, response) {
    // Save the raw response to the disk
    var filename = S(request.url).chompLeft('https://')
        .chompLeft('http://').replaceAll('/', '_').replaceAll(':', '');

    filename = path.join('data/responses/', filename.s);

    writeText(response.body, filename);

    console.debug("Reponse written to", filename);
}

function makeRequest(options) {
    var req = Object.assign({}, options.request);

    req['resolveWithFullResponse'] = true;

    transform = req['transform'];
    req['transform'] = function(body, response, resolveWithFullResponse) {
        // Save the raw response
        dumpResponse(req, response);

        // Scrape the body and return
        if (transform || options.scrape) {
            var scraped = transform ? transform(body, response, false)
                            : options.scrape(body);
            if (resolveWithFullResponse) {
                response.scraped = scraped;
                return response;
            } else {
                return scraped;
            }
        } else {
            return resolveWithFullResponse ? response : body;
        }
    };

    console.info("GET", req.url);
    return request(req).catch((error) => {
            // TODO If it's a temporary problem, retry.
            console.error(error);
        });
}

function findAndUpdateOrCreate(findOrCreate, record) {
    var promise = findOrCreate(record);

    if (promise == null) {
        console.warn("Crawler findOrCreate returned null.");
        return Promise.reject();
    }

    return promise.spread((object, created) => {
            if (created) {
                console.debug("Created", object.constructor.name, object.id);
                return [object, record];
            } else {
                return object.update(record).then(
                    (object) => {
                        console.debug("Updated", object.constructor.name, object.id,
                            "with the latest data.");
                        return [object, record];
                    }
                );
            }
        });
}

function crawler(options) {
    const defaultOptions = {
        scrape: null,
        schema: null,
        select: '*',

        findOrCreate: null,

        spread: null
    };

    options = Object.assign({}, defaultOptions, options);

    if (!options.findOrCreate) {
        throw Error("Option 'findOrCreate' is required.");
    }

    function acceptAndMoveOn(error) {
        console.error("Error:", error, "\n  record:" + JSON.toString(record));
        return Promise.resolve();
    }

    function processRecord(record, response) {
        if (typeof options.extendRecord == 'function') {
            Object.assign(record, options.extendRecord(record, response));
        }

        var promise = findAndUpdateOrCreate(options.findOrCreate, record);

        // Chain all options.spread in sequence.
        if (typeof options.spread == 'function') {
            promise = promise.spread(options.spread);
        }

        promise = promise.catch();

        return promise;
    }

    function processResponse(response) {
        var records = response.scraped;
        if (!records || !Array.isArray(records)) {
            console.warn("Incomprehensible Response:\n", records);
            return Promise.resolve(Error("Incomprehensible Response"));
        }

        var promises = [];
        records.forEach((record, i) => {

            promises.push(promise);
        });

        return Promise.all(promises).then(() => {
            // If headers have a next page link, request it too using same crawling options.
            if (response.headers.link) {
                var links = response.headers.link.split(",")
                                .filter((link) => link.match(/rel="next"/));
                if (links.length > 0) {
                    var next = new RegExp(/<(.*)>/).exec(links[0])[1];
                    var nextRequest = Object.assign({}, options.request, { 'url': next });
                    return makeRequest(Object.assign({}, options, { 'request': nextRequest }))
                            .then(processResponse);
                }
            }

            return Promise.resolve();
        });
    }

    return function() {
        var request = options.request;
        if (typeof request !== 'object') {
            request = {
                url: request
            }
        }

        if (typeof request.url === 'string' || request.url instanceof String) {
            return makeRequest(options).then(processResponse);

        } else if (Array.isArray(request.url)) {
            var promises = [];
            request.url.forEach((url) => {
                request = Object.assign({}, options.request, { 'url': url });
                promises.push(
                    makeRequest(Object.assign({}, options, { 'request': request }))
                    .then(processResponse));
            })
            return Promise.all(promises);

        } else {
            throw Error("Invalid request URL:", request.url);
        }
    }
}

function crawlXml(options) {
    if (!options.scrape) {
        // Scrape uses a schema to parse
        if (!options.schema) {
            throw Error("Option 'schema' is required.");
        }
        if (!options.select) {
            throw Error("Option 'select' is required.");
        }

        options.scrape = (body) => scrape.xml(options.select)
            .as(options.schema).scrape(body);
    }

    return crawler(options);
}

function crawlJson(options) {
    if (!options.scrape) {
        // Scrape uses a schema to parse
        if (!options.schema) {
            throw Error("Option 'schema' is required.");
        }
        if (!options.select) {
            throw Error("Option 'select' is required.");
        }

        options.scrape = (body) => scrape.json(options.select)
            .as(options.schema).scrape(body);
    }

    return crawler(options);
}

module.exports = {
    raw: (options) => crawler(options),
    xml: (options) => crawlXml(options),
    json: (options) => crawlJson(options),
};