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
    var req = options.request;
    if (typeof req === 'string' || req instanceof String) {
        req = {
            url: req
        }
    }

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

    return function() {
        return makeRequest(options)
            .then((records) => {
                if (!records || !Array.isArray(records)) {
                    console.warn("Incomprehensible Response:\n", records);
                    return Promise.resolve(Error("Incomprehensible Response"));
                }

                var promises = [];
                records.forEach((record, i) => {
                    // if (i > 0) { return };
                    var promise = findAndUpdateOrCreate(options.findOrCreate, record);

                    // Chain all options.spread in sequence.
                    if (typeof options.spread == 'function') {
                        promise = promise.spread(options.spread);
                    }

                    promise.catch((error) => {
                        console.error(error);
                    });

                    promises.push(promise);
                });

                return Promise.all(promises);
            });
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