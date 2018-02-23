const request = require('request-promise-native');
const cheerio = require('cheerio');
const date = require('date-and-time');
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
        request['transform'] = function(body) {
            // Save the raw response to the disk
            var file = S(request.url)
                .chompLeft('https://').chompLeft('http://')
                .replaceAll('/', '_').replaceAll(':', '');
            writeText(body, 'data/' + file + ".xml");

            return scrape.xml(options.select).as(options.schema)
                         .scrape(body);
        };

    } else {
        throw Error('Conflicting request.transform already defined.');
    }

    return request;
}

function filterNew(response, object) {
    function datesEqual(d1, d2) {
        d1 = d1 ? date.parse(d1, 'YYYY-MM-DD').valueOf() : false;
        d2 = d2 ? d2.valueOf() : false;
        return d1 == d2;
    }

    var filtered = {};
    Object.keys(response).forEach((field) => {
        filtered[field] = response[field];

        if (object && object[field] != undefined) {
            if (object[field] == filtered[field] ||
                    datesEqual(object[field], filtered[field])) {
                // Ignore fields that haven't changed.
                delete filtered[field];

            } else if (filtered[field] != undefined) {
                console.warn(object.constructor.name, object['id'] + "'s",
                    "[" + field +"]", typeof object[field],
                    "\"" + object[field] + "\"", "differs from the",
                    typeof filtered[field], "\"" + filtered[field] + "\" received.");

                if (typeof object[field] == Date) {
                    console.log("Date:", object[field].getTime());
                }

                // Ignore fields that are different.
                // TODO Keep both versions...
                delete filtered[field];
            }
        }

        if (filtered[field] == undefined || isNaN(filtered[field])) {
            delete filtered[field];
        }
    });

    return filtered;
}

function crawlXml(options) {
    return function() {
        return request(createRequest(options))
            .catch((error) => {
                // TODO If it's a temporary problem, retry.
                console.error(error);
            }).then((records) => {
                var promises = [];

                records.forEach((record, i) => {
                    var promise = options.findOrCreate(record).spread(
                        function(object, created) {
                            if (!created) {
                                var changed = filterNew(record, object);
                                // Update the record with all NEW fields
                                if (Object.keys(changed).length !== 0) {
                                    var update = object.update(changed)
                                        .then((obj) => console.debug("Updated:", changed))
                                        .error((e) => console.error("Error:", e));
                                    return [record, update, changed];

                                } else {
                                    console.info("" + object.id, "didn't change.");
                                }

                            } else {
                                console.debug("Created:", object.dataValues);
                            }

                            return [record, object];
                        }
                    ).catch((error) => {
                        console.error(error);
                    });

                    promises.push(promise);
                });

                return Promise.all(promises);
            });
    }
}

module.exports = crawlXml;