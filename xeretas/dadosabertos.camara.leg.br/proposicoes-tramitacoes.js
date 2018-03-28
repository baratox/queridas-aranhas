'use strict';

const crawl = require('../crawl.js');

const { Proposicao } = require('../../model');

module.exports = {
    name: "Histórico das Proposições",
    describe: "Histórico de passos na tramitação de uma proposta.",

    command: crawl.stepByStep([
        { 'set': function() {
            return {
                proposicoes: Proposicao.findAll({ attributes: ['idCamara'] })
                                       .map(p => p.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.proposicoes.map(proposition => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/proposicoes/' + proposition + '/tramitacoes',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Charset': 'utf-8'
                }
            }))
        }},

        { 'scrape': {
            select: 'dados'
        }}
    ])
}
