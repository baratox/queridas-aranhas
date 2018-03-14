'use strict';

const cheerio = require('cheerio');
const S = require('string');


function scrapeXml(SchemaParser, content, selector, schema) {
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

    return extract($(selector), schema);
}

module.exports = scrapeXml;