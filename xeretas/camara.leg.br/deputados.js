const request = require('request');
const cheerio = require('cheerio');

const Bottleneck = require("bottleneck");

const json = require('../../util/json');


const OUTPUT = 'data/camara.leg.br/deputados.json';

/**
 * [Deputados](http://www2.camara.leg.br/transparencia/dados-abertos/dados-abertos-legislativo/webservices/deputados/deputados)
 *
 * Retorna os deputados em exercício na Câmara dos Deputados, incluindo os detalhes
 * dos deputados com histórico de participação em comissões, períodos de exercício,
 * filiações partidárias e lideranças.
 */

function deputados() {
    request(
        'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterDeputados',
        function (error, response, body) {
            if (error) return console.error(error);

            var records = json.fromXml(body, 'deputados deputado');

            var writtenToDisk = false;

            // Rate limit the request for details to give the server some rest.
            var bottleneck = new Bottleneck({ maxConcurrent: 5 })
                    .on('error', function(error) {
                        console.error(error);
                    }).on('idle', function() {
                        // Execute after some timeout to give time for the last submitted request
                        // to finish.
                        setTimeout(function() {
                            json.write(records, OUTPUT);
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

                        console.log("  Got details for", record.ideCadastro, "-- Status ", response.statusCode);

                        record['detalhes'] = json.fromXml(details, 'Deputado')[0];
                    });
            });
        }
    );
}

module.exports = deputados;