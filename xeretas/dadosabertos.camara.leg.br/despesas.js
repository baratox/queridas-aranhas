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
                deputados: Deputado.findAll({ limit: 10, attributes: ['idCamara'] })
                                   .map(d => d.get('idCamara'))
            }
        }},

        function() {
            // Requests expenses for every deputy, in every legislature he might have
            // been elected in.
            return flatten(
                this.deputados.map(deputado =>
                    this.legislaturas.map(legislatura => ({
                        deputado: deputado,
                        legislatura: legislatura,
                    }))
                )
            )
        },

        { 'request': function(req) {
            this.deputado = req.deputado
            this.legislatura = req.legislatura
            return {
                // Send parameter in the Url to avoid issues with pagination
                url: '/deputados/' + req.deputado + '/despesas?idLegislatura=' + req.legislatura,
                qs: {
                    'itens': 100
                }
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                ano: scrape('ano').as.number(),
                mes: scrape('mes').as.number(),
                tipoDespesa: scrape('tipoDespesa').as.text(),
                idDocumento: scrape('idDocumento').as.number(),
                tipoDocumento: scrape('tipoDocumento').as.text(),
                idTipoDocumento: scrape('idTipoDocumento').as.number(),
                dataDocumento: scrape('dataDocumento').as.date('YYYY-MM-DD'),
                numDocumento: scrape('numDocumento').as.text(),
                valorDocumento: scrape('valorDocumento').as.number(),
                urlDocumento: scrape('urlDocumento').as.text(),
                nomeFornecedor: scrape('nomeFornecedor').as.text(),
                cnpjCpfFornecedor: scrape('cnpjCpfFornecedor').as.text(),
                valorLiquido: scrape('valorLiquido').as.number(),
                valorGlosa: scrape('valorGlosa').as.number(),
                numRessarcimento: scrape('numRessarcimento').as.number(),
                idLote: scrape('idLote').as.number(),
                parcela: scrape('parcela').as.number(),
            }),
        }}
    ])
}
