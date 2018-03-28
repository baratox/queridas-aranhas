'use strict';

const crawl = require('../crawl.js');

const { Proposicao } = require('../../model');

module.exports = {
    name: "Votações da Proposição",
    describe: "As votações por quais uma proposição já passou.",

    command: crawl.stepByStep([
        { 'set': function() {
            return {
                proposicoes: Proposicao.findAll({ attributes: ['idCamara'] })
                                       .map(p => p.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.proposicoes.map(proposition => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/proposicoes/' + proposition + '/votacoes',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Charset': 'utf-8'
                }
            }))
        }}

    ])
}
