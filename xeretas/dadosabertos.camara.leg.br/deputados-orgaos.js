const { crawler } = require('.');

const { Deputado } = require('../../model');

module.exports = {
    name: "Participação dos Deputados em Órgãos",
    describe: "Órgãos, como as comissões e procuradorias, dos quais o deputado participa " +
              "ou participou durante um intervalo de tempo. Cada item identifica o órgão, " +
              "o cargo ocupado pelo parlamentar neste órgão (como presidente, vice-presidente, "+
              "titular ou suplente) e as datas de início e fim da ocupação deste cargo.",

    command: crawler.stepByStep([
        function() {
            return Deputado.findAll({ attributes: ['idCamara'] })
                           .map(d => d.get('idCamara'))
        },

        { 'request': function(deputado) {
            this.deputado = deputado
            return {
                url: '/deputados/' + deputado + '/orgaos',
                qs: {
                    'itens': 100,
                    'dataInicio': '1500-01-01',
                    'ordenarPor': 'idOrgao'
                }
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idOrgao: scrape('idOrgao').as.number(),
                siglaOrgao: scrape('siglaOrgao').as.text(),
                nomeOrgao: scrape('nomeOrgao').as.text(),
                nomePapel: scrape('nomePapel').as.text(),
                dataInicio: scrape('dataInicio').as.date('YYYY-MM-DD'),
                dataFim: scrape('dataFim').as.date('YYYY-MM-DD'),
            }),
        }}
    ])
}
