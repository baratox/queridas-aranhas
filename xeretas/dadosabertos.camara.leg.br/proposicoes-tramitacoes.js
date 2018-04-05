'use strict';

const { crawler } = require('.');

const { Proposicao } = require('../../model');

module.exports = {
    name: "Histórico das Proposições",
    describe: "Histórico de passos na tramitação de uma proposta.",

    command: crawler.stepByStep([
        function() {
            return Proposicao.findAll({ attributes: ['idCamara'] })
                             .map(p => p.get('idCamara'))
        },

        { 'request': function(proposicao) {
            this.proposicao = proposicao
            return {
                url: '/proposicoes/' + proposicao + '/tramitacoes'
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                dataHora: scrape('dataHora').as.date('YYYY-MM-DDTHH:mm'),
                sequencia: scrape('sequencia').as.number(),
                siglaOrgao: scrape('siglaOrgao').as.text(),
                uriOrgao: scrape('uriOrgao').as.text(),
                regime: scrape('regime').as.text(),
                descricaoTramitacao: scrape('descricaoTramitacao').as.text(),
                idTipoTramitacao: scrape('idTipoTramitacao').as.number(),
                descricaoSituacao: scrape('descricaoSituacao').as.text(),
                idSituacao: scrape('idSituacao').as.number(),
                despacho: scrape('despacho').as.date('DD/MM/YYYY'),
                url: scrape('url').as.text(),
            }),
        }},
    ])
}
