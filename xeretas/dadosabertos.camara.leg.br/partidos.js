const { crawler } = require('.');

const { Partido } = require('../../model');

module.exports = {
    name: "Partidos",
    describe: "Partidos políticos que têm ou já tiveram deputados na Câmara.",

    command: crawler.stepByStep([
        { 'set': function() {
            return {
                legislaturas: Legislatura.findAll({ attributes: ['idCamara'] })
                                         .map(l => l.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.legislaturas.map(l => ({
                url: '/partidos/',
                qs: {
                    'idLegislatura': l,
                    'itens': 100
                }
            }));
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number()
            })
        }},

        { 'request': function(response) {
            return response.scraped.map(partido => ({
                url: '/partidos/' + partido.idCamara
            }));
        }},

        { 'scrape': {
        }}

    ])
}
