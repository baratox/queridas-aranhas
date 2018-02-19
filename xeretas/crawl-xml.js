const request = require('request-promise-native');
const cheerio = require('cheerio');
const date = require('date-and-time');
const S = require('string');

const { writeText } = require('../util/json');

function createRequest(request) {
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

            return cheerio.load(body, { xmlMode: true });
        };
    }

    return request;
}

function filterNew(response, object) {
    function datesEqual(d1, d2) {
        d1 = d1 ? date.parse(d1, 'YYYY-MM-DD').valueOf() : false;
        d2 = d2 ? d2.valueOf() : false;
        return d1 == d2;
    }

    Object.keys(response).forEach((field) => {
        if (object && object[field] != undefined) {
            if (object[field] == response[field] ||
                    datesEqual(object[field], response[field])) {
                // Ignore fields that haven't changed.
                delete response[field];

            } else if (response[field] != undefined) {
                console.warn(object.constructor.name, object['id'] + "'s",
                    "[" + field +"]", typeof object[field],
                    "\"" + object[field] + "\"", "differs from the",
                    typeof response[field], "\"" + response[field] + "\" received.");

                if (typeof object[field] == Date) {
                    console.log("Date:", object[field].getTime());
                }

                // Ignore fields that are different.
                // TODO Keep both versions...
                delete response[field];
            }
        }

        if (response[field] == undefined || isNaN(response[field])) {
            delete response[field];
        }
    });

    return response;
}

function crawlXml(options) {
    return function() {
        return request(createRequest(options.request))
            .catch((error) => {
                // TODO If it's a temporal problem, retry.
                console.error(error);
            }).then(($) => {
                var promises = [];
                $(options.select).each((i, elem) => {
                    const $elem = cheerio.load(elem, { xmlMode: true });
                    var p = options.parse($elem);

                    var promise = options.findOrCreate(p).spread((object, created) => {
                        if (!created) {
                            p = filterNew(p, object);
                            // Update the record with all NEW fields
                            if (Object.keys(p).length !== 0) {
                                return object.update(p)
                                    .then((obj) => console.debug("Updated:", p))
                                    .error((e) => console.error("Error:", e));

                            } else {
                                // console.debug("Up to date.");
                            }

                        } else {
                            console.debug("Created:", object.dataValues);
                        }
                    }).catch((error) => {
                        console.error(error);
                    });

                    promises.push(promise);
                });

                return Promise.all(promises);
            });
    }
}

module.exports = crawlXml;