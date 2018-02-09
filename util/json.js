const cheerio = require('cheerio');

const bfj = require('bfj');
const fs = require('fs-extra');
const path = require('path');


module.exports = {};

function isEmpty(object) {
    // because Object.keys(new Date()).length === 0;
    // we have to do some additional check
    return Object.keys(object).length === 0 && object.constructor === Object
}

module.exports.fromXml = function(xml, start) {
    var xmlTagToJson = function(record, elem) {
        $(elem).children().each(function(i, tag) {
            var $tag = $(tag);

            var property = $tag[0].name;
            var value;

            if ($tag.children().length == 0) {
                value = $tag.text();
            } else {
                value = {};
                xmlTagToJson(value, tag);
            }

            if (record[property] === undefined) {
                record[property] = value;
            } else {
                // The property is already defined, append the new value to it.
                record[property] = new Array(value).concat(record[property]);
            }
        });

        if (!isEmpty($(elem).attr())) {
            // XML Tags can not start with 'xml', so there should be no conflict.
            record['xml-attr'] = $(elem).attr();
        }
    }

    var records = [];

    const $ = cheerio.load(xml, { xmlMode: true });
    $(start).each(function(i, elem) {
        var record = {};
        xmlTagToJson(record, elem);
        records.push(record);
    });

    return records;
};


module.exports.write = function(records, filename) {
    fs.ensureDir(path.dirname(filename)).then(function() {
        bfj.write(filename, records).then(function() {
                console.info("Os", records.length, "registros foram salvos em", filename);
            }).catch(function(error) {
                console.error(error, error.stack);
            });
    });
}