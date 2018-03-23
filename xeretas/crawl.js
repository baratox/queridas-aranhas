const request = require('request-promise-native');
const S = require('string');

const scraper = require('../util/scrape');

const { writeText } = require('../util/json');
const path = require('path');


const knownTricks = {};

/**
 * Updates the context with the enumerable properties of `fields`. If a field
 * is a Promise, the resolved value is used for the field.
 *
 * Returns a Promise that resolves after all fields are resolved.
 */
 knownTricks['set'] = function(fields, resolution) {
    var promises = [];
    Object.keys(fields).forEach(field => {
        promises.push(Promise.resolve(fields[field]).then((val) => {
            // Saves the evaluated field to current context.
            this[field] = val;
        }));
    })

    // Returns the original resolution, after all evaluating promises resolve.
    return Promise.all(promises).then(() => resolution);
}

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

// TODO Support 'next' page
// TODO Translate qs array as multiple requests
knownTricks['request'] = function(options, resolution) {
    var request = options;
    if (typeof request !== 'object') {
        request = {
            url: request
        }
    }

    if (typeof request.url === 'string' || request.url instanceof String) {
        return makeRequest({ 'request': request });

    } else if (Array.isArray(request.url)) {
        var promises = [];
        request.url.forEach((url) => {
            request = Object.assign({}, options, { 'url': url });
            promises.push(makeRequest({ 'request': request }));
        })
        return promises;

    } else {
        throw Error("Invalid request URL:", request.url);
    }
}

knownTricks['scrape'] = function(options, response) {
    if (response.request === undefined) {
        throw new ValueError("Step 'scrape' must follow a 'request'.")
    }

    var scraped = scraper.select(options.select).as(options.schema)
                         .scrape(response);
    response.scraped = scraped;
    return response;
}

knownTricks['createOrUpdate'] = function(options, response) {
    var _crawler = crawler(options);
    return _crawler.processResponse(response);
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

            } else {
                return promise;
            }

        } else if (typeof scraped == 'object') {
            return options.promiseTo(scraped, response)
                .catch((error) => {
                    console.error("Error:", error);
                    return Promise.resolve();
                });
        }

    }

    var crawl = function() {
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

    // Expose internal functions for current options
    crawl.createOrUpdate = createOrUpdate;
    crawl.processResponse = processResponse;

    return crawl;
}



/**
 * Takes a single `step`. Steps may be defined as:
 * a) A function, to be called with the previous' step `resolution` as argument.
 * b) An object with a single property with the name of a trick to be executed
 *    with two arguments: the value of the property and `resolution`.
 *    If the value is a function, it's evaluated before executing the trick.
 */
function takeStep(step, resolution) {
    if (typeof step === 'function') {
        console.log("Applying function ", step.name, "(", typeof resolution, ") to\n    context:",
            Object.assign({}, this, { steps: '...' }), "\n");
        return step.call(this, resolution);

    } else if (typeof step === 'object') {
        var keys = Object.keys(step);
        if (keys.length != 1) {
            throw TypeError("Invalid trick step object.");
        }

        var trick = knownTricks[keys[0]];
        if (!trick) {
            throw TypeError("Unknown trick '{}'.".format(keys[0]));
        }

        console.log("Applying trick '", keys[0], "' (", typeof resolution, ") to\n    context:",
            Object.assign({}, this, { steps: '...' }), "\n");

        var definition = step[keys[0]];
        if (typeof definition === 'function') {
            definition = definition.call(this, resolution);
        }

        return trick.apply(this, [ definition, resolution ]);

    } else {
        throw TypeError("Steps must be either a 'function' or an 'object'.");
    }
}

function walkOneStep(promise, context, stepsTaken=0) {
    return promise.then((result) => {
        context = Object.assign({}, context);

        // console.log("Walking step", stepsTaken, "\nContext:",
        //         Object.assign({}, context, { steps: '...' }), "\n");

        var next = takeStep.call(context, context.steps[stepsTaken], result);
        stepsTaken++;
        if (next && next.constructor === Array) {
            if (stepsTaken < context.steps.length) {
                next = next.map((n) => walkOneStep(Promise.resolve(n), context, stepsTaken));
            }

            return Promise.all(next);

        } else {
            if (stepsTaken < context.steps.length) {
                next = walkOneStep(Promise.resolve(next), context, stepsTaken);
            }

            return Promise.resolve(next);
        }
    });
}

function crawlStepByStep(steps) {
    // Ensure steps is an Array
    steps = steps.constructor == Array ? steps : [steps];

    var context = { 'steps': steps };
    var promise = Promise.resolve();
    return () => walkOneStep(promise, context);
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
    stepByStep: (steps) => crawlStepByStep(steps)
};