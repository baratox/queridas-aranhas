'use strict';

const crawl = require('../crawl.js');

const { Proposicao } = require('../../model');

module.exports = {
    name: "Proposições Relacionadas",
    describe: "Relacionamento entre proposições.",

    command: crawl.stepByStep([
        { 'set': function() {
            return {
                proposicoes: Proposicao.findAll({ attributes: ['idCamara'] })
                                       .map(p => p.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.proposicoes.map(proposition => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/proposicoes/' + proposition + '/relacionadas',
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
