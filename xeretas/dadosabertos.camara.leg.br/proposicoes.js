const { crawler } = require('.');

const { Legislatura } = require('../../model');

module.exports = {
    name: "Proposições",
    describe: "Lista de informações básicas sobre projetos de lei, requerimentos, " +
              "medidas provisórias, emendas, pareceres e todos os outros tipos de " +
              "proposições na Câmara.",

    command: crawler.stepByStep([
        { 'set': function() {
            return {
                legislaturas: Legislatura.findAll({ attributes: ['idCamara'] })
                                         .map(l => l.get('idCamara'))
            }
        }},

        { 'request': function() {
            return {
                url: '/proposicoes/',
                qs: {
                    'dataInicio': '1500-01-01',
                    'itens': 100
                }
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number()
            })
        }},

        { 'request': function(response) {
            return response.scraped.map(proposicao => ({
                url: '/proposicoes/' + proposicao.idCamara
            }));
        }},

        { 'scrape': {
        }}

    ])
}
