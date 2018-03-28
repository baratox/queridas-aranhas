const crawl = require('../crawl.js');

const { Orgao } = require('../../model');

module.exports = {
    name: "Membros dos Órgãos",
    describe: "Membros do órgão legislativo.",

    command: crawl.stepByStep([
        { 'set': function() {
            return {
                orgaos: Orgao.findAll({ attributes: ['idCamara'] })
                                   .map(d => d.get('idCamara'))
            }
        },

        { 'request': function() {
            return this.orgaos.map(orgao => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/' + orgao + '/eventos',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Charset': 'utf-8'
                },
                qs: {
                    'itens': 100,
                    'dataInicio': '1500-01-01',
                    'ordenarPor': 'dataHoraInicio'
                }
            }))
        }},

        { 'scrape': {
            select: 'dados',
            schema: (scrape) => ({
                idCamara: scrape('id').as.number()
            })
        }},

        // Associa Evento ao Órgão (ambos já carregados)
    ])
}
