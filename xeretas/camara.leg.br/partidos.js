const request = require('request');
const cheerio = require('cheerio');

const json = require('../../util/json');


const OUTPUT = 'data/camara.leg.br/partidos.json';

/**
 * [Deputados](http://www2.camara.leg.br/transparencia/dados-abertos/dados-abertos-legislativo/webservices/deputados/deputados)
 *
 * Partidos com representação na Câmara dos Deputados.
 */

function crawl() {
    request(
        'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterPartidosCD',
        function (error, response, xml) {
            if (error) return console.error(error);

            var records = json.fromXml(xml, 'partidos partido');
            json.write(records, OUTPUT);
        }
    );
}

module.exports = crawl;