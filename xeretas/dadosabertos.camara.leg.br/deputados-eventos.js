const { crawler } = require('.');

const { Deputado } = require.main.require('./model');

module.exports = {
    name: "Participação dos Deputados em Eventos",
    describe: "Eventos nos quais a participação do deputado era ou é prevista.",
    weight: 500,
    command: crawler.stepByStep([
        function() {
            return Deputado.findAll({ attributes: ['idCamara'] })
                           .map(d => d.get('idCamara'))
        },

        { 'request': function(deputado) {
            this.deputado = deputado
            return {
                url: '/deputados/' + deputado + '/eventos',
                qs: {
                    'itens': 100,
                    // O serviço falha com timeout quando um período grande é usado
                    'dataInicio': '2018-01-01',
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
            })
        }},

        // Associa Evento ao Deputado (ambos já carregados)
    ])
}
