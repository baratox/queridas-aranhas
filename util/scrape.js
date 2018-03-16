const date = require('date-and-time');
const S = require('string');

const scrapeXml = require('./scrape.xml.js');
const scrapeJson = require('./scrape.json.js');

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

function Scraper(selector, schema) {
    this.select = (selector) => {
        return new Scraper(selector, schema);
    };

    this.as = (schema) => {
        return new Scraper(selector, schema);
    }

    function getContentType(response) {
        // Consider using the `content-type` library for a robust comparison.
        var contentType = response.headers['content-type'];
        if (contentType.indexOf('application/json') >= 0) {
            return 'json'
        } else if (contentType.indexOf('text/xml') >= 0) {
            return 'xml'
        } else {
            return null;
        }
    }

    this.scrape = (response) => {
        var type = getContentType(response);
        if (type && typeof this.scrape[type] === 'function') {
            return this.scrape[type](response.body);
        } else {
            throw new TypeError("Response is of unexpected type: " +
                response.headers['content-type']);
        }
    }
    this.scrape.xml = (content) => {
        var scraped = scrapeXml(SchemaParser, content, selector, schema);
        removeEmpty(scraped);
        return scraped;
    }
    this.scrape.json = (content) => {
        var scraped = scrapeJson.scrape(SchemaParser, content, selector, schema);
        removeEmpty(scraped);
        return scraped;
    }

    this.describe = (response) => {
        var type = getContentType(response);
        if (type && typeof this.describe[type] === 'function') {
            return this.describe[type](response.body);
        } else {
            throw new TypeError("Response is of unexpected type: " +
                response.headers['content-type']);
        }
    }
    this.describe.xml = (content) => {
        return scrapeXml.describe(content, selector);
    }
    this.describe.json = (content) => {
        return scrapeJson.describe(content, selector);
    }
}

module.exports = new Scraper();