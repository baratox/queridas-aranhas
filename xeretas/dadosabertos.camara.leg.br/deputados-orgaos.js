const { crawler } = require('.');

const { Deputado } = require('../../model');

module.exports = {
    name: "Participação dos Deputados em Órgãos",
    describe: "Órgãos, como as comissões e procuradorias, dos quais o deputado participa " +
              "ou participou durante um intervalo de tempo. Cada item identifica o órgão, " +
              "o cargo ocupado pelo parlamentar neste órgão (como presidente, vice-presidente, "+
              "titular ou suplente) e as datas de início e fim da ocupação deste cargo.",

    command: crawler.stepByStep([
        { 'set': function() {
            return {
                deputados: Deputado.findAll({ attributes: ['idCamara'] })
                                   .map(d => d.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.deputados.map(deputy => ({
                url: '/deputados/' + deputy + '/orgaos',
                qs: {
                    'itens': 100,
                    'dataInicio': '1500-01-01',
                    'ordenarPor': 'idOrgao'
                }
            }))
        }},

        { 'scrape': {
        }}
    ])
}
