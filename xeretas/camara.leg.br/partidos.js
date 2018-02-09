const request = require('request');
const cheerio = require('cheerio');
const bfj = require('bfj');
const fs = require('fs-extra');

const Bottleneck = require("bottleneck");

const OUTPUT_DIR = 'data/camara.leg.br/';
const OUTPUT = OUTPUT_DIR + 'partidos.json';

/**
 * [Deputados](http://www2.camara.leg.br/transparencia/dados-abertos/dados-abertos-legislativo/webservices/deputados/deputados)
 *
 * Partidos com representação na Câmara dos Deputados.
 */

function convertXmlToJson(body, selector) {
    var records = [];

    var xmlTagToJson = function(record, elem) {
        $(elem).children().each(function(i, tag) {
            $tag = $(tag);
            if ($tag.children().length == 0) {
                record[$tag[0].name] = $tag.text();
            } else {
                record[$tag[0].name] = {};
                xmlTagToJson(record[$tag[0].name], tag);
            }
        });
    }

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
        'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterPartidosCD',
        function (error, response, xml) {
            if (error) return console.error(error);

            var records = convertXmlToJson(xml, 'partidos partido');
            writeToDisk(records);
        }
    );
}

module.exports = crawl;