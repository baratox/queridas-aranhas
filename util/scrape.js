const cheerio = require('cheerio');
const date = require('date-and-time');
const S = require('string');

function removeEmpty(obj) {
    if (obj) {
        Object.keys(obj).forEach(function(key) {
            if (obj[key] && typeof obj[key] === 'object'
                && obj[key]['sequelize'] === undefined) {
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
                var value = elem != null ? extract(elem) : null;
                if (value) {
                    if (value.constructor === Array) {
                        value = value.map((v) => {
                            var parsed = parseInt(v, 10);
                            return isNaN(parsed) ? null : parsed;
                        });
                    } else {
                        var parsed = parseInt(value, 10);
                        value = isNaN(parsed) ? null : parsed;
                    }
                }
                return value;
            }
            as.date = function(format) {
                var value = elem != null ? extract(elem) : null;
                if (value) {
                    if (value.constructor === Array) {
                        value = value.map((v) => {
                            // Convert all non-digit separators to /
                            v = v.replace(/[^\d]/g, '/');
                            var parsed = date.parse(v, format || 'DD/MM/YYYY');
                            return isNaN(parsed) ? null : parsed;
                        });
                    } else {
                        // Convert all non-digit separators to /
                        value = value.replace(/[^\d]/g, '/');
                        var parsed = date.parse(value, format || 'DD/MM/YYYY');
                        value = isNaN(parsed) ? null : parsed;
                    }
                }
                return value;
            }
            as.mapped = function(map) {
                if (elem != null) {
                    var key = extract(elem);
                    if (map[key]) {
                        return map[key];
                    } else {
                        console.warn("Invalid key '" + key + "' for", selector);
                        console.debug(JSON.stringify(map));
                    }
                }

                return null;
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
            if (selector.constructor !== Array) {
                selector = ("" + selector).split(/[ \.]+/);
            }

            var selected = json;
            for (var i = 0; i < selector.length; i++) {
                var s = selector[i];
                if (selected.constructor !== Array) {
                    if (selected.hasOwnProperty(s)) {
                        selected = selected[s];
                    } else {
                        throw Error("Unmatched selector: '" + s + "' in:" +
                            JSON.stringify(selected))
                    }

                } else {
                    for (var j = 0; j < selected.length; j++) {
                        if (selected[j].hasOwnProperty(s)) {
                            selected[j] = selected[j][s];
                        } else {
                            throw Error("Unmatched selector: '" + s + "' in: " +
                                JSON.stringify(selected[j]))
                        }
                    }
                }
            }

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
                evaluate = (elem) => elem;
            }

            if (typeof el == 'object' && el.constructor !== Number
                    && el.constructor !== Array) {
                return schema ? evaluate(el) : el;

            } else if (el.constructor === Array) {
                var data = [];
                el.forEach((element) => {
                    var record = evaluate(element);
                    if (record != null) {
                        data.push(record);
                    }
                });

                return data;

            } else {
                return el;
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
