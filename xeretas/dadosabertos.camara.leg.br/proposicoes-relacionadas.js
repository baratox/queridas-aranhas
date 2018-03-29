'use strict';

const { crawler } = require('.');

const { Proposicao } = require('../../model');

module.exports = {
    name: "Proposições Relacionadas",
    describe: "Relacionamento entre proposições.",

    command: crawler.stepByStep([
        { 'set': function() {
            return {
                proposicoes: Proposicao.findAll({ attributes: ['idCamara'] })
                                       .map(p => p.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.proposicoes.map(proposition => ({
                url: '/proposicoes/' + proposition + '/relacionadas'
            }))
        }},

        { 'scrape': {
        }}
    ])
}
