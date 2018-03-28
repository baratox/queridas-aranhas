'use strict';

const crawl = require('../crawl.js');

const { Proposicao } = require('../../model');

module.exports = {
    name: "Votações",
    describe: "Detalhes sobre cada votação, como o relator, o encaminhamento dado como " +
              "consequência da votação e as orientações das bancadas.",

    command: crawl.stepByStep([
        { 'set': function() {
            return {
                // SELECT DISTINCT V.idCamara FROM VotacaoProposicao
                votacoes: Proposicao.findAll({ attributes: ['idCamara'] })
                                    .map(v => v.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.votacoes.map(votacao => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/votacoes/' + votacao + '/votacoes',
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
