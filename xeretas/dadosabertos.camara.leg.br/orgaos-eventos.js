const { crawler } = require('.');

const { Orgao } = require('../../model');

module.exports = {
    name: "Eventos Relacionados aos Órgãos",
    describe: "Informações resumidas dos eventos ocorridos ou previstos no órgão legislativo.",

    command: crawler.stepByStep([
        function() {
            return Orgao.findAll({ attributes: ['idCamara'] })
                        .map(o => o.get('idCamara'))
        },

        { 'request': function(orgao) {
            this.orgao = orgao
            return {
                url: '/orgaos/' + orgao + '/eventos',
                qs: {
                    'itens': 100,
                    'dataInicio': '1500-01-01',
                    'ordenarPor': 'dataHoraInicio'
                }
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number(),
                uri: scrape('uri').as.text(),
                dataHoraInicio: scrape('dataHoraInicio').as.date('YYYY-MM-DDTHH:mm'),
                dataHoraFim: scrape('dataHoraFim').as.date('YYYY-MM-DDTHH:mm'),
                descricaoSituacao: scrape('descricaoSituacao').as.text(),
                descricaoTipo: scrape('descricaoTipo').as.text(),
                titulo: scrape('titulo').as.text(),
                localExterno: null,
                localCamara: scrape('localCamara').as((scrape) => ({
                    nome: scrape('nome').as.text(),
                    predio: null,
                    sala: null,
                    andar: null,
                })),
            }),
        }},

        // Associa Evento ao Órgão (ambos já carregados)
    ])
}
