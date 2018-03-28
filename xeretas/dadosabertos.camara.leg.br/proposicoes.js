const crawl = require('../crawl.js');

const { Legislatura } = require('../../model');

module.exports = {
    name: "Proposições",
    describe: "Lista de informações básicas sobre projetos de lei, requerimentos, " +
              "medidas provisórias, emendas, pareceres e todos os outros tipos de " +
              "proposições na Câmara.",

    command: crawl.stepByStep([
        { 'set': function() {
            return {
                legislaturas: Legislatura.findAll({ attributes: ['idCamara'] })
                                         .map(l => l.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.legislaturas.map(l => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/proposicoes/',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Charset': 'utf-8'
                },
                qs: {
                    'dataInicio': '1500-01-01',
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
            return response.scraped.map(proposicao => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/proposicoes/' + proposicao.idCamara,
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
