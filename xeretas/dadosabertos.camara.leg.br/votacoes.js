'use strict';

const { crawler } = require('.');

const { Votacao } = require.main.require('./model');

module.exports = {
    name: "Votações",
    describe: "Detalhes sobre cada votação, como o relator, o encaminhamento dado como " +
              "consequência da votação e as orientações das bancadas.",

    command: crawler.stepByStep([
        function() {
            return Votacao.findAll({ attributes: ['idCamara'] })
                          .map(v => v.get('idCamara'))
        },

        { 'request': function(votacao) {
            this.votacao = votacao
            return {
                url: '/votacoes/' + votacao
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
                aprovada: null,
                placarSim: scrape('placarSim').as.number(),
                placarNao: scrape('placarNao').as.number(),
                placarAbstencao: scrape('placarAbstencao').as.number(),
                relator: null,
                ementaParecer: null,
                dataHoraInicio: scrape('dataHoraInicio').as.date('YYYY-MM-DD HH:mm:ss'),
                dataHoraFim: scrape('dataHoraFim').as.date('YYYY-MM-DD HH:mm:ss'),
                numVotantes: null,
                numPresentes: null,
                despacho: null,
            }),
        }}
    ])
}
