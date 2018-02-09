const request = require('request');
const cheerio = require('cheerio');

const json = require('../../util/json');


const OUTPUT = 'data/camara.leg.br/blocos-partidarios.json';

/**
 * [Deputados](http://www2.camara.leg.br/transparencia/dados-abertos/dados-abertos-legislativo/webservices/deputados/deputados)
 *
 * Blocos de Partidos com representação na Câmara dos Deputados.
 */

function crawl() {
    request(
        { url: 'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterPartidosBlocoCD',
          qs: { idBloco: '', numLegislatura: '' } },
        function (error, response, xml) {
            if (error) return console.error(error);

            var records = json.fromXml(xml, 'blocos bloco');
            json.write(records, OUTPUT);
        }
    );
}

module.exports = crawl;