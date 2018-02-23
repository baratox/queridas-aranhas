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
            writeText(body, 'data/' + filename + ".xml");

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
                console.debug("Created", object.id);
                return [object, record];
            } else {
                return object.update(record).then(
                    (object) => {
                        console.debug("Updated", object.id,
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
        spread: []
    };

    options = Object.assign({}, defaultOptions, options);

    return function() {
        return request(createRequest(options))
            .catch((error) => {
                // TODO If it's a temporary problem, retry.
                console.error(error);
            }).then((records) => {
                var promises = [];

                records.forEach((record, i) => {
                    var promise = findAndUpdateOrCreate(options.findOrCreate, record);

                    // Chain all options.spread handlers in sequence.
                    for (handler in options.spread) {
                        promise = promise.spread(handler);
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