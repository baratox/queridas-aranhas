'use strict';

const crawl = require('../crawl.js');

const { Votacao, Voto } = require('../../model');

module.exports = {
    name: "Votos",
    describe: "Votos de cada deputado nas votações.",

    command: crawl.stepByStep([
        { 'set': function() {
            return {
                votacoes: Votacao.findAll({ attributes: ['idCamara'] })
                                 .map(v => v.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.votacoes.map(votacao => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/votacoes/' + votacao + '/votos',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Charset': 'utf-8'
                },
                qs: {
                    'itens': 100
                }
            }))
        }},

        { 'scrape': {
            select: 'dados'
        }}
    ])
}
