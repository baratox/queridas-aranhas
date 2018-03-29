'use strict';

const { crawler } = require('.');

const { Proposicao } = require('../../model');

module.exports = {
    name: "Votações",
    describe: "Detalhes sobre cada votação, como o relator, o encaminhamento dado como " +
              "consequência da votação e as orientações das bancadas.",

    command: crawler.stepByStep([
        { 'set': function() {
            return {
                // SELECT DISTINCT V.idCamara FROM VotacaoProposicao
                votacoes: Proposicao.findAll({ attributes: ['idCamara'] })
                                    .map(v => v.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.votacoes.map(votacao => ({
                url: '/votacoes/' + votacao + '/votacoes'
            }))
        }},

        { 'scrape': {
        }}
    ])
}
