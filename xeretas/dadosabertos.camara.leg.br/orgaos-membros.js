const { crawler } = require('.');

const { Orgao } = require('../../model');

module.exports = {
    name: "Membros dos Órgãos",
    describe: "Membros do órgão legislativo.",

    command: crawler.stepByStep([
        function() {
            return Orgao.findAll({ attributes: ['idCamara'] })
                        .map(o => o.get('idCamara'))
        },

        // Todas as requisições falham com status 500.
        { 'request': function(orgao) {
            this.orgao = orgao
            return {
                url: '/orgaos/' + orgao + '/membros',
                qs: {
                    'itens': 100,
                    'dataInicio': '1500-01-01',
                }
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number()
            })
        }},
    ])
}
