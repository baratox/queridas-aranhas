'use strict';

const { crawler } = require('.');

const { Votacao } = require.main.require('./model');

module.exports = {
    name: "Votos",
    describe: "Votos de cada deputado nas votações.",

    command: crawler.stepByStep([
        function() {
            return Votacao.findAll({ attributes: ['idCamara'] })
                          .map(v => v.get('idCamara'))
        },

        { 'request': function(votacao) {
            this.votacao = votacao
            return {
                url: '/votacoes/' + votacao + '/votos',
                qs: {
                    'itens': 100
                }
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                voto: scrape('voto').as.text(),
                parlamentar: scrape('parlamentar').as((scrape) => ({
                    idCamara: scrape('id').as.number(),
                    uri: scrape('uri').as.text(),
                    nome: scrape('nome').as.text(),
                    siglaPartido: scrape('siglaPartido').as.text(),
                    uriPartido: scrape('uriPartido').as.text(),
                    siglaUf: scrape('siglaUf').as.text(),
                    idLegislatura: scrape('idLegislatura').as.number(),
                    urlFoto: scrape('urlFoto').as.text(),
                })),
            }),
        }}
    ])
}
