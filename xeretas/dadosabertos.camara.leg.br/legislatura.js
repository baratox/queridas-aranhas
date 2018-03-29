const { crawler } = require('.');

const { Legislatura } = require('../../model');

module.exports = {
    name: "Legislatura",
    describe: "São os períodos de trabalhos legislativos, iniciados no dia " +
              "da posse dos parlamentares após uma eleição e encerrados na " +
              "véspera da posse dos deputados seguintes.",

    command: crawler.stepByStep([
        { 'request': {
            url: '/legislaturas',
            qs: {
                'itens': 100
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number(),
                uri: scrape('uri').as.text(),
                inicio: scrape('dataInicio').as.date('YYYY/MM/DD'),
                fim: scrape('dataFim').as.date('YYYY/MM/DD')
            })
        }},

        { 'createOrUpdate': {
            findOrCreate: function(legislatura) {
                return Legislatura.findOrCreate({
                    where: { 'idCamara': legislatura.idCamara },
                    defaults: legislatura
                });
            }
        }}
    ])
}
