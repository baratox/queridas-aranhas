'use strict';

const { crawler } = require('.');

const { Proposicao, Votacao } = require('../../model');

module.exports = {
    name: "Votações da Proposição",
    describe: "As votações por quais uma proposição já passou.",

    command: crawler.stepByStep([
        function() {
            return Proposicao.findAll({ attributes: ['idCamara'] })
                             .map(p => p.get('idCamara'))
        },

        { 'request': function(proposicao) {
            this.proposicao = proposicao
            return {
                url: '/proposicoes/' + proposicao + '/votacoes'
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number(),
                uri: scrape('uri').as.text(),
                titulo: scrape('titulo').as.text(),
                uriEvento: scrape('uriEvento').as.text(),
                proposicao: scrape('proposicao').as((scrape) => ({
                    idCamara: scrape('id').as.number(),
                    uri: scrape('uri').as.text(),
                    siglaTipo: null,
                    idTipo: null,
                    numero: null,
                    ano: null,
                    ementa: scrape('ementa').as.text(),
                    ementa: scrape('ementa').as.date('DD, de MM de janeiro de YYYY'),
                })),
                uriProposicaoPrincipal: scrape('uriProposicaoPrincipal').as.text(),
                tipoVotacao: scrape('tipoVotacao').as.text(),
                aprovada: scrape('aprovada').as.number(),
                placarSim: scrape('placarSim').as.number(),
                placarNao: scrape('placarNao').as.number(),
                placarAbstencao: scrape('placarAbstencao').as.number(),
            }),
        }},

        { 'createOrUpdate': {
            findOrCreate: function(votacao) {
                return Votacao.findOrCreate({
                    where: { 'idCamara': votacao.idCamara },
                    defaults: votacao
                });
            }
        }}
    ])
}
