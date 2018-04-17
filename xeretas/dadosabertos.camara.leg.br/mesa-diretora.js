const { crawler } = require('.');

const { Legislatura } = require.main.require('./model');

module.exports = {
    name: "Mesa Diretora",
    describe: "Quais deputados fizeram parte da Mesa Diretora em uma legislatura.",
    weight: 250,
    command: crawler.stepByStep([
        function() {
            return Legislatura.findAll({ attributes: ['idCamara'] })
                              .map(l => l.get('idCamara'))
        },

        { 'request': function(legislatura) {
            return {
                url: '/legislaturas/' + legislatura + '/mesa'
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idLegislatura: scrape('idLegislatura').as.number(),
                idCamara: scrape('id').as.number(),
                uri: scrape('uri').as.text(),
                nome: scrape('nome').as.text(),
                siglaPartido: scrape('siglaPartido').as.text(),
                uriPartido: scrape('uriPartido').as.text(),
                siglaUf: scrape('siglaUf').as.text(),
                urlFoto: scrape('urlFoto').as.text(),
                nomePapel: scrape('nomePapel').as.text(),
                idPapel: scrape('idPapel').as.number(),
            }),
        }}
    ])
}
