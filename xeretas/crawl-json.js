const crawl = require('./crawl.js');


function crawlJSON(options) {
    if (!options.scrape) {
        if (!options.select) {
            throw Error("Option 'select' is required.");
        }

        options.scrape = (body) => {
            var select = options.select;
            if (!Array.isArray(select)) {
                select = ("" + select).split('[ \.]');
            }

            console.debug("Selecting", select);

            var scraped = JSON.parse(body);
            select.forEach((selector) => {
                if (scraped.hasOwnProperty(selector)) {
                    scraped = scraped[selector];
                } else {
                    console.error("Unmatched selector:", selector);
                }
            })

            return scraped;
        }
    }

    return crawl(options);
}


module.exports = crawlJSON;