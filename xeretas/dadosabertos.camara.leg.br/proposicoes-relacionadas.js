'use strict';

const { crawler } = require('.');

const { Proposicao } = require.main.require('./model');

module.exports = {
    name: "Proposições Relacionadas",
    describe: "Relacionamento entre proposições.",

    command: crawler.stepByStep([
        function() {
            return Proposicao.findAll({ attributes: ['idCamara'] })
                             .map(p => p.get('idCamara'))
        },

        { 'request': function(proposicao) {
            this.proposicao = proposicao
            return {
                url: '/proposicoes/' + proposicao + '/relacionadas'
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number(),
                uri: scrape('uri').as.text(),
                siglaTipo: scrape('siglaTipo').as.text(),
                idTipo: scrape('idTipo').as.number(),
                numero: scrape('numero').as.number(),
                ano: scrape('ano').as.number(),
                ementa: scrape('ementa').as.text(),
            }),
        }},
    ])
}
