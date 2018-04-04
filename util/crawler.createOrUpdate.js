'use strict';

const _ = require('lodash');

const crawler = require('./crawler.js');
const scraper = require('./scrape.js');

const DEBUG = process.env.DEBUG == 1 || false;

module.exports = crawler.trick('createOrUpdate', function(options, response) {
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
