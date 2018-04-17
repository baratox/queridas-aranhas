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
            try {
                promises.push(options.promiseTo(options, response, record));
            } catch(error) {
                promises.push(Promise.resolve(error));
            }
        });

        return Promise.all(promises);

    } else if (typeof scraped == 'object') {
        try {
            return options.promiseTo(options, response, scraped)
        } catch(error) {
            return Promise.resolve(error);
        }
    }
}, {
    'promiseTo': function (options, response, record) {
        if (!options.findOrCreate) {
            throw Error("Option 'findOrCreate' is required.");
        }

        if (typeof options.extendRecord == 'function') {
            Object.assign(record, options.extendRecord(record, response));
        }

        return findAndUpdateOrCreate(options.findOrCreate, record);
    },
    'extendRecord': null,
    'findOrCreate': null,
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
            return { created: true, instance: object, attributes: record }
        } else {
            return object.update(record).then((updatedObject) => {
                return { updated: true, instance: updatedObject, attributes: record }
            })
        }
    });
}
