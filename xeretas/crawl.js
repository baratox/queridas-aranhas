const request = require('request-promise-native');
const RequestErrors = require('request-promise-native/errors');
const S = require('string');

const scraper = require('../util/scrape');

const { writeText } = require('../util/json');
const path = require('path');

function Crawler(tricks = {}) {
    // Deep clone all tricks
    tricks = Object.assign({}, tricks);
    Object.keys(tricks).forEach(trick => {
        tricks[trick] = Object.assign({}, tricks[trick]);
    })

    function trick(name, executor, defaults = {}) {
        if (arguments.length === 1) {
            if (tricks[name]) {
                return tricks[name];
            } else {
                throw TypeError("Unknown trick '" + name + "'");
            }

        } else if (arguments.length > 1) {
            var trick = tricks[name];
            if (trick === undefined) {
                trick = {
                    'name': name
                }

                tricks[name] = trick;
            }

            // Sets or updates the executor function
            if (executor && typeof executor === 'function') {
                trick['execute'] = function(context, options, resolution) {
                    console.log("Executing trick", this.name);
                    if (typeof options === 'function') {
                        options = options.call(context, resolution);
                    }

                    var instances = options.constructor === Array ? options : [options];
                    instances = instances.map(instanceOptions => {
                        // Apply default options to each execution
                        instanceOptions = Object.assign({}, this.defaults, instanceOptions);
                        return executor.apply(context, [instanceOptions, resolution]);
                    });

                    return instances.length === 1 ? instances[0] : instances;
                }
            }

            if (arguments.length >= 3) {
                trick['defaults'] = defaults;
            }

            return trick;
        }
    }

    // Returns a copy of this crawler with the given options applied as defaults to each step.
    function defaults(options) {
        var clone = Crawler(tricks);
        if (options && typeof options === 'object') {
            Object.keys(options).forEach(trick => {
                clone.trick(trick, null,
                    Object.assign({}, clone.trick(trick).defaults, options[trick]));
            });
        }

        return clone;
    }

    /**
     * Takes a single `step`. Steps may be defined as:
     * a) A function, to be called with the previous' step `resolution` as argument.
     * b) An object with a single property with the name of a trick to be executed
     *    with two arguments: the value of the property and `resolution`.
     *    If the value is a function, it's evaluated before executing the trick.
     */
    function takeStep(step, resolution) {
        this.history = (this.history ? this.history + '-->' : '')
            + (Math.random()*0xFF<<0).toString(16);

        var result;
        if (typeof step === 'function') {
            console.log("\nApplying function ", step.name, "(", typeof resolution,
                ") to\n    context:", "(" + this.stepsTaken + ")", this.history, Object.keys(this));
            result = step.call(this, resolution);

        } else if (typeof step === 'object') {
            var keys = Object.keys(step);
            if (keys.length === 1) {
                console.log("\nApplying trick '", keys[0], "' (", typeof resolution,
                    ") to\n    context:", "(" + this.stepsTaken + ")", this.history, Object.keys(this));

                var options = step[keys[0]];
                var t = trick(keys[0]);
                result = t.execute(this, options, resolution);

                console.log("\nTrick '", keys[0], "' returned:", result.constructor.name ,
                    " to\n    context:", "(" + this.stepsTaken + ")", this.history, Object.keys(this));


            } else {
                throw TypeError("Invalid trick step object.");
            }

        } else {
            console.log(this);
            throw TypeError("Steps must be either a 'function' or an 'object', not " + typeof step);
        }

        if (result && result.constructor === Array) {
            if (this.stepsTaken + 1 < this.steps.length) {
                console.log("Following next step for each.");
                result = result.map(n =>
                    walkOneStep(Promise.resolve(n), this, this.stepsTaken + 1));
            }

            return Promise.all(result);

        } else {
            if (this.stepsTaken + 1 < this.steps.length) {
                console.log("Following next step");
                result = walkOneStep(Promise.resolve(result), this, this.stepsTaken + 1);
            }

            return Promise.resolve(result);
        }
    }

    function walkOneStep(promise, context, stepsTaken=0) {
        // console.log("Walking after", promise);
        return promise.then((result) => {
            // console.log("Walking after ...", JSON.stringify(result));
            if (result && result.constructor === Array) {
                result = result.map(x => {
                    if (x && x.constructor !== Promise) {
                        return walkOneStep(Promise.resolve(x), context, stepsTaken);
                    } else {
                        return x;
                    }
                });

                return Promise.all(result);

            } else {
                context = Object.assign({}, context);
                if (context.stepsTaken != stepsTaken) {
                    context.step = context.steps[stepsTaken];
                    context.stepsTaken = stepsTaken;
                }

                result = takeStep.call(context, context.step, result);
                return Promise.resolve(result);
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

    return {
        stepByStep: crawlStepByStep,
        trick: trick,
        defaults: defaults
    }
}

var crawler = Crawler();

/**
 * Updates the context with the enumerable properties of `fields`. If a field
 * is a Promise, the resolved value is used for the field.
 *
 * Returns a Promise that resolves after all fields are resolved.
 */
crawler.trick('set', function(fields, resolution) {
    var promises = [];
    Object.keys(fields).forEach(field => {
        promises.push(Promise.resolve(fields[field]).then((val) => {
            // Saves the evaluated field to current context.
            this[field] = val;
        }));
    })

    // Returns the original resolution, after all evaluating promises resolve.
    return Promise.all(promises).then(() => resolution);
});

function dumpResponse(request, response) {
    // Save the raw response to the disk
    var filename = S(request.url).chompLeft('https://')
        .chompLeft('http://').replaceAll('/', '_').replaceAll(':', '');

    filename = path.join('data/responses/', filename.s);

    writeText(response.body, filename);

    console.debug("Reponse written to", filename);
}

function makeRequest(options) {
    console.info("GET", options.url, options ? '? ' + JSON.stringify(options) : '');
    return options.request(options).then(response => {
            dumpResponse(options, response);
            return response;
        }).catch(error => {
            // TODO If it's a temporary problem, retry.
            if (error instanceof RequestErrors.StatusCodeError) {
                console.error("Request failed with non 2xx status:", error.response.statusCode);
                return error.response;
            } else {
                console.error("Request failed.", error);
                return null;
            }
        });
}

crawler.trick('request', function(options, resolution) {
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
                // Repeat this 'request' step, only changing the url
                var s = Object.assign({}, options, { 'url': next });
                // s = Object.assign({}, context.step, { 'request': s });

                var ctx = Object.assign({}, context);

                return [
                    response,
                    takeStep.call(ctx, s, ctx.stepsTaken)
                ];
            }
        }

        return response;
    }

    var promises = [];
    if (typeof options.url === 'string' || options.url instanceof String) {
        promises.push(makeRequest(options).then(repeatRequestIfNextPage));

    } else if (Array.isArray(options.url)) {
        options.url.forEach((url) => {
            var urlRequest = Object.assign({}, options, { 'url': url });
            promises.push(
                makeRequest(urlRequest).then(repeatRequestIfNextPage));
        })

    } else {
        throw Error("Invalid request URL:", options.url);
    }

    return promises;
}, {
    'request': request,
    'resolveWithFullResponse': true,
    'transform2xxOnly': true
});

crawler.trick('scrape', function(options, response) {
    if (response.request === undefined) {
        throw new TypeError("Step 'scrape' must follow a 'request'.")
    }

    console.debug("Scraping", response.request.uri.href);

    var configuredScraper = scraper;
    if (options.select) {
        configuredScraper = configuredScraper.select(options.select);
    }

    if (options.scrape) {
        response.scraped = configuredScraper.as(options.schema).scrape(response);
    }

    if (options.describe) {
        response.schema = configuredScraper.describe(response);
    }

    return response;

}, {
    'scrape': true,
    'describe': false,
    'select': undefined,
    'schema': function() { }
});

crawler.trick('createOrUpdate', function(options, response) {
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
            promises.push(options.promiseTo(options, response, record)
                .catch((error) => {
                    console.error("Error:", error, "\n  record:", JSON.toString(record));
                    return Promise.resolve();
                })
            );
        });

        return Promise.all(promises);

    } else if (typeof scraped == 'object') {
        return options.promiseTo(options, response, scraped)
            .catch((error) => {
                console.error("Error:", error);
                return Promise.resolve();
            });
    }
}, {
    'promiseTo': function (options, response, record) {
        if (!options.findOrCreate) {
            throw Error("Option 'findOrCreate' is required.");
        }

        if (typeof options.extendRecord == 'function') {
            Object.assign(record, options.extendRecord(record, response));
        }

        var promise = findAndUpdateOrCreate(options.findOrCreate, record);

        // Chain all options.spread in sequence.
        if (typeof options.spread == 'function') {
            promise = promise.then(options.spread);
        }

        return promise;
    },
    'extendRecord': null,
    'findOrCreate': null,
    'spread': null
});

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

module.exports = crawler;