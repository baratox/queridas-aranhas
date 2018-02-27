const request = require('request-promise-native');
const cheerio = require('cheerio');
const S = require('string');

const scrape = require('../util/scrape');

const { writeText } = require('../util/json');

function createRequest(options) {
    var request = options.request;
    if (typeof request === 'string' || request instanceof String) {
        request = {
            url: request
        }
    }

    if (!request['transform']) {
        // Load the XML body with cheerio
        request['transform'] = function(body, response, resolveWithFullResponse) {
            // Save the raw response to the disk
            var filename = S(request.url).chompLeft('https://')
                .chompLeft('http://').replaceAll('/', '_').replaceAll(':', '');
            filename = 'data/' + filename.s + '.xml';
            writeText(body, filename);
            console.debug("Reponse written to", filename);

            // Scrape the body and return
            var scraped = scrape.xml(options.select)
                            .as(options.schema).scrape(body);
            if (resolveWithFullResponse) {
                response.scraped = scraped;
                return response;
            } else {
                return scraped;
            }
        };

    } else {
        console.warn("Transformation overriden in request.transform. " +
                     "Make sure to scrape response yourself.");
    }

    return request;
}

function findAndUpdateOrCreate(findOrCreate, record) {
    var promise = findOrCreate(record)
        .spread((object, created) => {
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

    return promise;
}

function crawlXml(options) {
    const defaultOptions = {
        findOrCreate: () => { throw Error("findOrCreate is not defined.") },
        schema: () => { throw Error("schema is not defined.") },
        spread: null
    };

    options = Object.assign({}, defaultOptions, options);

    return function() {
        return request(createRequest(options))
            .catch((error) => {
                // TODO If it's a temporary problem, retry.
                console.error(error);
            }).then((records) => {
                var promises = [];

                if (!records) {
                    return Promise.resolve();
                }

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

module.exports = crawlXml;