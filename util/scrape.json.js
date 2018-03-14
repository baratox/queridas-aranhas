'use strict';

function scrapeJson(SchemaParser, content, selector, schema) {
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

    return extract(jsonSelect(json, selector), schema);
}

module.exports = scrapeJson;