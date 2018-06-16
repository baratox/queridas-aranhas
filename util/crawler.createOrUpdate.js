'use strict';

const _ = require('lodash');

const crawler = require('./crawler.js');

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
            var promise = undefined;
            try {
                promise = options.promiseTo(options, response, record);

                // if (i < 3) {
                //     if (i % 2 === 0) {
                //         promise = Promise.reject(new Error("That's Odd"));
                //     } else {
                //         promise = options.promiseTo(options, response, record);
                //     }
                // }
            } catch(error) {
                promise = Promise.reject(error);
            }

            if (promise) {
                // Resolve with error instead of rejecting
                promise = promise.then(result => {
                    if (_.isError(result)) {
                        throw result;
                    } else {
                        return result;
                    }
                }).catch(error => error);

                promises.push(promise);
            }
        });

        return Promise.all(promises);

    } else if (typeof scraped == 'object') {
        var promise;
        try {
            promise = options.promiseTo(options, response, scraped)
        } catch(error) {
            promise = Promise.reject(error);
        }

        return promise.then(result => {
            if (_.isError(result)) {
                throw result;
            } else {
                return result;
            }
        }).catch(error => error);
    }
}, {
    'promiseTo': function (options, response, record) {
        try {
            if (!options.findOrCreate) {
                throw Error("Option 'findOrCreate' is required.");
            }

            if (typeof options.extendRecord == 'function') {
                Object.assign(record, options.extendRecord(record, response));
            }

            return findAndUpdateOrCreate(options.findOrCreate, record);

        } catch(error) {
            return Promise.reject(error);
        }
    },
    'extendRecord': null,
    'findOrCreate': null,
});

function findAndUpdateOrCreate(findOrCreate, record) {
    var promise = findOrCreate(record);
    if (promise == null) {
        console.warn("Crawler findOrCreate returned null.");
        promise = Promise.reject();
    }

    return promise.then(([object, created, updatedRecord]) => {
        if (updatedRecord) {
            record = updatedRecord;
        }

        if (created) {
            return { created: true, instance: object, attributes: record }
        } else {
            return object.update(record).then((updatedObject) => {
                return { updated: true, instance: updatedObject, attributes: record }
            })
        }
    });
}
