const scrape = require('../util/scrape');
const crawl = require('./crawl.js');


function crawlXml(options) {
    if (!options.scrape) {
        // Scrape uses a schema to parse
        if (!options.schema) {
            throw Error("Option 'schema' is required.");
        }
        if (!options.select) {
            throw Error("Option 'select' is required.");
        }

        options.scrape = (body) => scrape.xml(options.select)
            .as(options.schema).scrape(body);
    }

    return crawl(options);
}


module.exports = crawlXml;