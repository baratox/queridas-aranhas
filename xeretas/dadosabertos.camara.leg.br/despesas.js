const flatten = require('array-flatten');

const { crawler } = require('.');

const { Legislatura, Deputado } = require('../../model');

module.exports = {
    name: "Despesas dos Deputados",
    describe: "Registros de pagamentos e reembolsos feitos pela Câmara em prol " +
              "do deputado, a título da chamada 'cota parlamentar'.",

    command: crawler.stepByStep([
        { 'set': function() {
            return {
                legislaturas: Legislatura.findAll({ attributes: ['idCamara'] })
                                         .map(l => l.get('idCamara')),
                deputados: Deputado.findAll({ attributes: ['idCamara'] })
                                   .map(d => d.get('idCamara'))
            }
        }},

        { 'request': function() {
            // Requests expenses for every deputy, in every legislature he might have
            // been elected in.
            return flatten(
                this.deputados.map(deputy =>
                    this.legislaturas.map(legislature => ({
                        url: '/deputados/' + deputy + '/despesas',
                        qs: {
                            'idLegislatura': legislature,
                            'itens': 100
                        }
                    }))
                )
            )
        }},

        { 'scrape': {
        }}
    ])
}
