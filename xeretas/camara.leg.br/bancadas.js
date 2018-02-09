const request = require('request');
const cheerio = require('cheerio');

const json = require('../../util/json');


const OUTPUT = 'data/camara.leg.br/bancadas.json';

/**
 * [Bancadas](http://www2.camara.leg.br/transparencia/dados-abertos/dados-abertos-legislativo/webservices/deputados/obterlideresbancadas)
 *
 * Retorna os deputados líderes e vice-líderes em exercício das bancadas dos partidos
 */

function crawl() {
    request(
        { url: 'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterLideresBancadas',
          qs: { idBloco: '', numLegislatura: '' } },
        function (error, response, xml) {
            if (error) return console.error(error);

            var records = json.fromXml(xml, 'bancada');
            json.write(records, OUTPUT);
        }
    );
}

module.exports = crawl;