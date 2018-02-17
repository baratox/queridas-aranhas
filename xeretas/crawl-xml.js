const cheerio = require('cheerio');

function filterNew(response, object) {
    if (object) {
        Object.keys(response).forEach((field) => {
            if (object[field] !== undefined) {
                if (object[field] == response[field]) {
                    // Ignore fields that haven't changed.
                    delete response[field];

                } else if (response[field] !== undefined) {
                    console.warn(object.name, object['id'], field,
                        "\"" + object[field] + "\"", "differs from the",
                        "\"" + response[field] + "\" received.");
                    // Ignore fields that are different.
                    // TODO Keep both versions...
                    delete response[field];
                }
            }
        });
    }

    return response;
}

function crawlXml(options) {
    return function(error, response, body) {
        // TODO If it's a temporal problem, retry.
        if (error) return console.error(error);

        console.debug("   Response", response.statusCode, response.request.href);

        var promises = [];

        const $ = cheerio.load(body, { xmlMode: true });
        $(options.select).each((i, elem) => {
            const $elem = cheerio.load(elem, { xmlMode: true });
            var p = options.parse($elem);
            console.debug("      ", i);

            var promise = options.findOrCreate(p).spread((object, created) => {
                if (!created) {
                    p = filterNew(p, object);
                    // Update the record with all NEW fields
                    if (p.length > 0) {
                        object.update(p).error((e) => console.error("Error:", e));
                        console.debug("         Updated:", p);
                    } else {
                        console.debug("         Up to date.");
                    }

                } else {
                    console.debug("         Created:", object);
                }
            });

            promises.push(promise);
        });

        return Promise.all(promises);
    }
}

module.exports = crawlXml;