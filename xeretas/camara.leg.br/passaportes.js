const request = require('request');
const cheerio = require('cheerio');

const json = require('../../util/json');


const OUTPUT = 'data/camara.leg.br/passaportes.json';

/**
 * [Viagens oficiais e passaportes](http://www2.camara.leg.br/transparencia/viagens-oficiais-e-passaportes)
 *
 * Passaportes diplomáticos
 * Consulta sobre passaportes diplomáticos emitidos para os deputados e seus dependentes.
 */

function passaportes() {
    request(
        { url: 'https://www.camara.gov.br/passaporteConsulta/passaportes-resultado',
          method: 'GET',
          qs: { 'ideCadastro': 'TODOS' },
          headers: {
            // Por "medida de segurança" eles bloqueam se não for um navegador conhecido
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:58.0) Gecko/20100101 Firefox/58.0',
          }},
        function (error, response, body) {
            if (error) return console.error(error);

            var passaportes = [];

            const $ = cheerio.load(body);
            $(".resultado-passaporte tbody tr").each(function() {
                passaportes.push({
                    'nome': $("td#nomeParlamentar", this).text(),
                    'afinidade': $("td#afinidade", this).text(),
                    'emissao': $("td#dataEmissao", this).text(),
                    'vencimento': $("td#dataVencimento", this).text()
                });
            });

            json.write(passaportes, OUTPUT);
        }
    );
}

module.exports = passaportes;