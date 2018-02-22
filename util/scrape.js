const cheerio = require('cheerio');
const date = require('date-and-time');
const S = require('string');

function removeEmpty(obj) {
    Object.keys(obj).forEach(function(key) {
        if (obj[key] && typeof obj[key] === 'object') {
            removeEmpty(obj[key]);
        } else if (obj[key] == null) {
            delete obj[key];
        }
    });
};

function SchemaParser(schema) {
    return function(record, select, extract) {
        // Scrape function that is available to schema implementation.
        var scrape = function(selector) {
            var elem = select(selector);
            if (elem != null) {
                var as = function(subschema) {
                    var value = extract(elem, subschema);
                    return value;
                }

                as.text = function() {
                    var value = extract(elem);
                    return value;
                }
                as.number = function() {
                    var value = extract(elem);
                    var parsed = parseInt(value, 10);
                    return isNaN(parsed) ? null : parsed;
                }
                as.date = function() {
                    var value = extract(elem);
                    if (value) {
                        var parsed = date.parse(value, 'DD/MM/YYYY');
                        return isNaN(parsed) ? null : parsed;
                    } else {
                        return null;
                    }
                }

                return { as: as };

            } else {
                console.error(selector, "not found");
                return null;
            }
        }

        return schema(scrape);
    }
}

function XmlScraper() {
    var scrapeXml = (content, selector, schema) => {
        var $ = cheerio.load(content, { xmlMode: true });

        var extract = (el, schema) => {
            var evaluate;
            if (schema) {
                var sub = SchemaParser(schema);
                evaluate = (elem) => {
                    // Select inside each element
                    var sub$ = (selector) => $(selector, elem);
                    return sub(elem, sub$, extract);
                }
            } else {
                evaluate = (elem) =>
                    S($(elem).text()).collapseWhitespace().s;
            }

            if (el.length == 1) {
                return evaluate(el);

            } else if (el.length > 1) {
                var data = [];
                el.each((i, element) => {
                    var record = evaluate(element);
                    if (record != null) {
                        data.push(record);
                    }
                });

                return data;

            } else {
                return null;
            }
        }

        var data = extract($(selector), schema);
        removeEmpty(data);
        return data;
    }

    return (selector) => ({
        as: (schema) => ({
            scrape: (content) =>
                scrapeXml(content, selector, schema)
        })
    });
}

module.exports.xml = XmlScraper();
