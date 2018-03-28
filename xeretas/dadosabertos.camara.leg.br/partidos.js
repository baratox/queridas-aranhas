const crawl = require('../crawl.js');

const { Partido } = require('../../model');

module.exports = {
    name: "Partidos",
    describe: "Partidos políticos que têm ou já tiveram deputados na Câmara.",

    command: crawl.stepByStep([
        { 'set': function() {
            return {
                legislaturas: Legislatura.findAll({ attributes: ['idCamara'] })
                                         .map(l => l.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.legislaturas.map(l => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/partidos/',
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
            return response.scraped.map(partido => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/partidos/' + partido.idCamara,
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
