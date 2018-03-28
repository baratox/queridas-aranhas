const crawl = require('../crawl.js');

const { Legislatura } = require('../../model');

module.exports = {
    name: "Deputados",
    describe: "Os representantes do povo são os principais agentes da Câmara — " +
              "como autores de proposições, membros de órgãos, etc. A quantidade " +
              "de votos recebidos nas eleições determinam se eles serão titulares " +
              "ou suplentes no exercício dos mandatos, que são as vagas que um " +
              "partido obtém para cada legislatura.",

    command: crawl.stepByStep([
        { 'set': function() {
            return {
                legislaturas: Legislatura.findAll({ attributes: ['idCamara'] })
                                         .map(l => l.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.legislaturas.map(l => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/deputados/',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Charset': 'utf-8'
                },
                qs: {
                    'idLegislatura': l,
                    'itens': 100
                }
            }));
        }},

        { 'scrape': {
            select: 'dados',
            schema: (scrape) => ({
                idCamara: scrape('id').as.number()
            })
        }},

        { 'request': function(response) {
            return response.scraped.map(deputado => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/deputados/' + deputado.idCamara,
                headers: {
                    'Accept': 'application/json',
                    'Accept-Charset': 'utf-8'
                }
            }));
        }},

        { 'scrape': {
            select: 'dados'
        }}

    ])
}
