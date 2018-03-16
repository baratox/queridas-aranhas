const request = require('request-promise-native');
const S = require('string');

const scraper = require('../util/scrape');

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
    req['transform2xxOnly'] = true;
    req['transform'] = function(body, response, resolveWithFullResponse) {
        // Save the raw response
        dumpResponse(req, response);

        // Scrape the body and return
        if (options.scrape) {
            var scraped = options.scrape(body);
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

    return promise.then(([object, created, updatedRecord]) => {
            if (updatedRecord) {
                record = updatedRecord;
            }

            if (created) {
                console.debug("Created", object.constructor.name, object.id);
                return [object, record];
            } else {
                return object.update(record).then(
                    (updated) => {
                        console.debug("Updated", updated.constructor.name, updated.id,
                            "with the latest data.");
                        return [updated, record];
                    }
                );
            }
        }).catch(err => {
            console.error("Failed to Create or Update.", err);
        });
}

function crawler(options) {
    const defaultOptions = {
        scrape: null,
        schema: null,
        select: '*',

        promiseTo: createOrUpdate,
        findOrCreate: null,

        spread: null
    };

    options = Object.assign({}, defaultOptions, options);

    function acceptAndMoveOn(error, record) {
        console.error("Error:", error, "\n  record:" + JSON.toString(record));
        return Promise.resolve();
    }

    function createOrUpdate(record, response) {
        if (!options.findOrCreate) {
            throw Error("Option 'findOrCreate' is required.");
        }

        if (typeof options.extendRecord == 'function') {
            Object.assign(record, options.extendRecord(record, response));
        }

        var promise = findAndUpdateOrCreate(options.findOrCreate, record);

        // Chain all options.spread in sequence.
        if (typeof options.spread == 'function') {
            promise = promise.spread(options.spread);
        }

        return promise;
    }

    function processResponse(response) {
        if (!(/^2/.test('' + response.statusCode))) {
            console.error("Request failed with status", response.statusCode);
            return Promise.resolve(response);
        }

        var scraped = response.scraped;
        if (!scraped) {
            console.error("Incomprehensible Response for ", response.request.url);
            return Promise.resolve(response);
        }

        if (scraped.constructor === Array) {
            var promises = [];
            scraped.forEach((record, i) => {
                promises.push(options.promiseTo(record, response)
                    .catch((error) => {
                        console.error("Error:", error, "\n  record:", JSON.toString(record));
                        return Promise.resolve();
                    })
                );
            });

            var promise = Promise.all(promises);

            // If headers have a next page link, request it too using same crawling options.
            if (response.headers.link) {
                return promise.then(() => {
                    var links = response.headers.link.split(",")
                                    .filter((link) => link.match(/rel="next"/));
                    if (links.length > 0) {
                        var next = new RegExp(/<(.*)>/).exec(links[0])[1];
                        var nextRequest = Object.assign({}, options.request, { 'url': next });
                        return makeRequest(Object.assign({}, options, { 'request': nextRequest }))
                                .then(processResponse);
                    }
                });
            }

        } else if (typeof scraped == 'object') {
            return options.promiseTo(scraped, response)
                .catch((error) => {
                    console.error("Error:", error);
                    return Promise.resolve();
                });
        }

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
        options.scrape = (body) => {
            return scraper.select(options.select)
                          .as(options.schema)
                          .scrape.xml(body);
        }
    }

    return crawler(options);
}

function crawlJson(options) {
    if (!options.scrape) {
        options.scrape = (body) => {
            return scraper.select(options.select)
                          .as(options.schema)
                          .scrape.json(body);
        }
    }

    return crawler(options);
}

module.exports = {
    raw: (options) => crawler(options),
    xml: (options) => crawlXml(options),
    json: (options) => crawlJson(options),
};