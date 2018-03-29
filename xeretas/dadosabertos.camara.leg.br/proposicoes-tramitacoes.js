'use strict';

const { crawler } = require('.');

const { Proposicao } = require('../../model');

module.exports = {
    name: "Histórico das Proposições",
    describe: "Histórico de passos na tramitação de uma proposta.",

    command: crawler.stepByStep([
        { 'set': function() {
            return {
                proposicoes: Proposicao.findAll({ attributes: ['idCamara'] })
                                       .map(p => p.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.proposicoes.map(proposition => ({
                url: '/proposicoes/' + proposition + '/tramitacoes'
            }))
        }},

        { 'scrape': {
        }}
    ])
}
