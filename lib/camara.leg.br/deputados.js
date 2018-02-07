const request = require('request');
const cheerio = require('cheerio');
const bfj = require('bfj');
const fs = require('fs-extra');

const Bottleneck = require("bottleneck");

const OUTPUT_DIR = 'data/camara.leg.br/';
const OUTPUT = OUTPUT_DIR + 'deputados.json';

/**
 * [Deputados](http://www2.camara.leg.br/transparencia/dados-abertos/dados-abertos-legislativo/webservices/deputados/deputados)
 *
 * Retorna os deputados em exercício na Câmara dos Deputados, incluindo os detalhes
 * dos deputados com histórico de participação em comissões, períodos de exercício,
 * filiações partidárias e lideranças.
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

function deputados() {
    request(
        'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterDeputados',
        function (error, response, body) {
            if (error) return console.error(error);

            var records = convertXmlToJson(body, 'deputados deputado');

            var writtenToDisk = false;

            // Rate limit the request for details to give the server some rest.
            var bottleneck = new Bottleneck({ maxConcurrent: 10 })
                    .on('error', function(error) {
                        console.error(error);
                    }).on('idle', function() {
                        // Execute after some timeout to give time for the last submitted request
                        // to finish.
                        setTimeout(function() {
                            console.log("Gravando", records.length, "registros em", OUTPUT);

                            fs.ensureDir(OUTPUT_DIR).then(function() {
                                bfj.write(OUTPUT, records)
                                    .then(function() {
                                        console.info("Os", records.length, "deputados foram salvos em", OUTPUT);
                                        writtenToDisk = true;
                                    }).catch(function(error) {
                                        console.error(error, error.stack);
                                    });
                            });
                        }, 5000);
            })

            // Get the datails for each Deputado from another webservice.
            records.forEach(function(record) {
                bottleneck.submit(
                    request,
                    {   url: 'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterDetalhesDeputado',
                        qs: { ideCadastro: record.ideCadastro,
                              numLegislatura: '' }},
                    function(err, resp, details) {
                        if (err) return console.error(err);
                        if (writtenToDisk) {
                            // The results were written to the disk before this request for details was finished.
                            throw new Error("Flushed before job finised.");
                        }

                        record['detalhes'] = convertXmlToJson(details, 'Deputado')[0];
                    });
            });
        }
    );
}

module.exports = deputados;