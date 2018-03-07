const cheerio = require('cheerio');
const date = require('date-and-time');
const S = require('string');

function removeEmpty(obj) {
    if (obj) {
        Object.keys(obj).forEach(function(key) {
            if (obj[key] && typeof obj[key] === 'object') {
                removeEmpty(obj[key]);
            } else if (obj[key] == null
                || (obj[key].length != undefined && obj[key].length == 0)) {
                delete obj[key];
            }
        });
    }

};

function SchemaParser(schema) {
    return function(record, select, extract) {
        // Scrape function that is available to schema implementation.
        var scrape = function(selector) {
            var elem = select(selector);
            var as = function(subschema) {
                var value = elem != null ? extract(elem, subschema) : null;
                return value;
            }

            as.text = function() {
                var value = elem != null ? extract(elem) : null;
                return value;
            }
            as.number = function() {
                if (elem != null) {
                    var value = extract(elem);
                    var parsed = parseInt(value, 10);
                    return isNaN(parsed) ? null : parsed;
                } else {
                    return null;
                }
            }
            as.date = function(format) {
                var value = elem != null ? extract(elem) : null;
                if (value) {
                    // Convert all non-digit separators to /
                    value = value.replace(/[^\d]/g, '/');
                    var parsed = date.parse(value, format || 'DD/MM/YYYY');
                    return isNaN(parsed) ? null : parsed;
                } else {
                    return null;
                }
            }

            return { as: as };
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

function JsonScraper() {
    var scrapeJson = (content, selector, schema) => {
        var json = JSON.parse(content);

        // Select inside each element
        function jsonSelect(json, selector) {
            if (!Array.isArray(selector)) {
                selector = ("" + selector).split('[ \.]');
            }

            var selected = json;
            selector.forEach((s) => {
                if (selected.hasOwnProperty(s)) {
                    selected = selected[s];
                } else {
                    console.error("Unmatched selector:", s);
                    return null;
                }
            });

            return selected;
        }

        var extract = (el, schema) => {
            var evaluate;

            if (schema) {
                var sub = SchemaParser(schema);
                evaluate = (elem) => {
                    var select = (selector) => jsonSelect(elem, selector);
                    return sub(elem, select, extract);
                }
            } else {
                evaluate = (selector) => jsonSelect(el, selector);
            }

            if (!Array.isArray(el)) {
                return el;

            } else if (el.length > 1) {
                var data = [];
                el.forEach((element) => {
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

        var data = extract(jsonSelect(json, selector), schema);
        removeEmpty(data);
        return data;
    }

    return (selector) => ({
        as: (schema) => ({
            scrape: (content) =>
                scrapeJson(content, selector, schema)
        })
    });
}


module.exports.xml = XmlScraper();
module.exports.json = JsonScraper();
