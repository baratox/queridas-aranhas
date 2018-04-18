'use strict';

const _ = require('lodash');

const crawler = require('./crawler.js');
const scraper = require('./scrape.js');

const DEBUG = process.env.DEBUG == 1 || false;

module.exports = crawler.trick('scrape', function(options, response) {
    if (_.isError(response)) {
        throw response;
    }

    if (response.request === undefined) {
        console.error("Invalid request before scrape at ", this.history,
            typeof response, JSON.stringify(Object.keys(response)));
        throw new TypeError("Step 'scrape' must follow a 'request'.")
    }

    if (DEBUG) { console.debug("Scraping", response.request.uri.href); }

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
