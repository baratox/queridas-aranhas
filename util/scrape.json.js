'use strict';

const { URL } = require('url');
const date = require('date-and-time');

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


function scrapeJson(SchemaParser, content, selector, schema) {
    var json = JSON.parse(content);

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

function speculateType(anything) {
    function isUrl(string) {
        try {
            var url = new URL(string);
            return true;
        } catch(err) {
            return false;
        }
    }

    function speculateDateFormat(string) {
        // Any character sequence used as separator
        var n = '([^\\d]+)';
        var HH = '([0-1][\\d]|2[0-3])'
        var mm = '([0-5][\\d])'
        var ss = '([0-5][\\d])'
        var DD = '(0[1-9]|[1-2][\\d]|3[0-1])'
        var MM = '(0[1-9]|1[0-2])'
        var YYYY = '([1-2][\\d]{3})'

        var knownFormats = {
            'DD_MM_YYYY_HH_mm_ss':
                new RegExp([DD, n, MM, n, YYYY, n, HH, n, mm, n, ss].join('')),
            'YYYY_MM_DD_HH_mm_ss':
                new RegExp([YYYY, n, MM, n, DD, n, HH, n, mm, n, ss].join('')),
            'DD_MM_YYYY_HH_mm':
                new RegExp([DD, n, MM, n, YYYY, n, HH, n, mm].join('')),
            'YYYY_MM_DD_HH_mm':
                new RegExp([YYYY, n, MM, n, DD, n, HH, n, mm].join('')),
            'DD_MM_YYYY':
                new RegExp([DD, n, MM, n, YYYY].join('')),
            'YYYY_MM_DD':
                new RegExp([YYYY, n, MM, n, DD].join(''))
        }

        for (var format in knownFormats) {
            var match = knownFormats[format].exec(string);
            if (match) {
                // Replace the _ placeholder in the format with the actual separators
                // matched in the value.
                var i = 2;
                var f = format.replace(/_/g, () => {
                    var separator = match[i];
                    i += 2;
                    return separator;
                });

                return f;
            }
        }

        return false;
    }


    if (anything === null) {
        return { type: 'null' };

    } else if (anything === undefined) {
        return { type: 'undefined' };

    } else {
        if (anything.constructor === Array) {
            return {
                type: '[]',
                array: true,
                length: anything.length
            }

        } else if (anything.constructor === Number) {
            return {
                type: 'number'
            }

        } else if (anything.constructor === String) {
            var spec = {
                type: 'string',
                length: anything.length
            }

            if (isUrl(anything)) {
                spec.type = 'url';
            } else {
                var format = speculateDateFormat(anything);
                if (format) {
                    spec.type = 'date';
                    spec.format = format;
                }
            }

            return spec;

        } else if (typeof anything === 'object') {
            return {
                type: 'object'
            }
        }
    }

    return { type: 'unknown' }
}

function saw(spec, type, value) {
    if (!spec['#seen']) {
        spec['#seen'] = {};
    }
    var seen = spec['#seen'];
    if (!seen[type.type]) {
        seen[type.type] = { count: 0 };
    }
    seen = seen[type.type];

    seen.count++;
    if (type.length !== undefined) {
        if (seen.length === undefined) {
            seen.length = {
                min: Number.MAX_VALUE,
                max: -1
            }
        }

        if (seen.length.min > type.length) {
            seen.length.min = type.length;
        }

        if (seen.length.max < type.length) {
            seen.length.max = type.length;
        }
    }

    if (type.format !== undefined) {
        if (seen.format === undefined) {
            seen.format = type.format;
        } else if (seen.format.constructor === String) {
            if (seen.format != type.format) {
                seen.format = new Set([seen.format, type.format]);
            }
        } else if (seen.format.constructor === Set) {
            seen.format.add(type.format);
        }
    }
}

function describe(element, known) {
    known = known || {};

    var type = speculateType(element);
    saw(known, type, element);

    if (!type.array || type.length == 0) {
        if (type.type == 'object') {
            Object.keys(element).forEach(attr => {
                known[attr] = describe(element[attr], known[attr]);
            })
        }

    } else {
        element.forEach(arrayElem => {
            var arrayElemType = speculateType(arrayElem);
            arrayElemType.type = arrayElemType.type + '[]';
            saw(known, arrayElemType, arrayElem);

            if (arrayElemType.type == 'object[]') {
                Object.keys(arrayElem).forEach(attr => {
                    known[attr] = describe(arrayElem[attr], known[attr]);
                })
            }
        })
    }

    return known;
}

module.exports.scrape = scrapeJson;
module.exports.describe = describe;