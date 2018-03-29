'use strict';

const { crawler } = require('.');

const { Votacao, Voto } = require('../../model');

module.exports = {
    name: "Votos",
    describe: "Votos de cada deputado nas votações.",

    command: crawler.stepByStep([
        { 'set': function() {
            return {
                votacoes: Votacao.findAll({ attributes: ['idCamara'] })
                                 .map(v => v.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.votacoes.map(votacao => ({
                url: '/votacoes/' + votacao + '/votos',
                qs: {
                    'itens': 100
                }
            }))
        }},

        { 'scrape': {
        }}
    ])
}
