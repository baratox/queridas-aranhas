const request = require('request');
const cheerio = require('cheerio');
const bfj = require('bfj');
const fs = require('fs-extra');

const Bottleneck = require("bottleneck");

const OUTPUT_DIR = 'data/camara.leg.br/';
const OUTPUT = OUTPUT_DIR + 'bancadas.json';

/**
 * [Bancadas](http://www2.camara.leg.br/transparencia/dados-abertos/dados-abertos-legislativo/webservices/deputados/obterlideresbancadas)
 *
 * Retorna os deputados líderes e vice-líderes em exercício das bancadas dos partidos
 */

function isEmpty(object) {
    // because Object.keys(new Date()).length === 0;
    // we have to do some additional check
    return Object.keys(object).length === 0 && object.constructor === Object
}

function convertXmlToJson(body, selector) {
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
            record['attr'] = $(elem).attr();
        }
    }

    var records = [];

    const $ = cheerio.load(body, { xmlMode: true });
    $(selector).each(function(i, elem) {
        var record = {};
        xmlTagToJson(record, elem);
        records.push(record);
    });

    return records;
}

function writeToDisk(records) {
    console.log("Gravando", records.length, "registros em", OUTPUT);

    fs.ensureDir(OUTPUT_DIR).then(function() {
        bfj.write(OUTPUT, records)
            .then(function() {
                console.info("Os", records.length, "registros foram salvos em", OUTPUT);
                writtenToDisk = true;
            }).catch(function(error) {
                console.error(error, error.stack);
            });
    });
}

function crawl() {
    request(
        { url: 'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterLideresBancadas',
          qs: { idBloco: '', numLegislatura: '' } },
        function (error, response, xml) {
            if (error) return console.error(error);

            var records = convertXmlToJson(xml, 'bancada');
            writeToDisk(records);
        }
    );
}

module.exports = crawl;