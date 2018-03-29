const { crawler } = require('.');

const { Orgao } = require('../../model');

module.exports = {
    name: "Eventos Relacionados aos Órgãos",
    describe: "Informações resumidas dos eventos ocorridos ou previstos no órgão legislativo.",

    command: crawler.stepByStep([
        { 'set': function() {
            return {
                orgaos: Orgao.findAll({ attributes: ['idCamara'] })
                                   .map(d => d.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.orgaos.map(orgao => ({
                url: '/orgaos/' + orgao + '/eventos',
                qs: {
                    'itens': 100,
                    'dataInicio': '1500-01-01',
                    'ordenarPor': 'dataHoraInicio'
                }
            }))
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number()
            })
        }},

        // Associa Evento ao Órgão (ambos já carregados)
    ])
}
