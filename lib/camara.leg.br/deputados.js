const request = require('request');
const cheerio = require('cheerio');
const bfj = require('bfj');
const fs = require('fs-extra');

const OUTPUT_DIR = 'data/camara.leg.br/';
const OUTPUT = OUTPUT_DIR + 'deputados-atuais.json';

/**
 * [Viagens oficiais e passaportes](http://www2.camara.leg.br/transparencia/viagens-oficiais-e-passaportes)
 *
 * Passaportes diplomáticos
 * Consulta sobre passaportes diplomáticos emitidos para os deputados e seus dependentes.
 */

function deputadosAtuais() {
    request(
        'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterDeputados',
        function (error, response, body) {
            if (error) return console.error(error);

            var records = [];

            const $ = cheerio.load(body, { xmlMode: true });
            $('deputados deputado').each(function(i, elem) {
                var record = {};

                $('*', this).each(function(j, tag) {
                    $tag = $(tag);
                    record[$tag[0].name] = $tag.text();
                });

                records.push(record);
            });

            console.log("Gravando", records.length, "registros em", OUTPUT);

            fs.ensureDir(OUTPUT_DIR).then(function() {
                bfj.write(OUTPUT, records)
                    .then(function() {
                        console.info("Os", records.length, "deputados foram salvos em", OUTPUT);
                    }).catch(function(error) {
                        console.error(error, error.stack);
                    });
            });
        }
    );
}

module.exports = deputadosAtuais;