const crawl = require('../crawl.js');

const { Deputado } = require('../../model');

module.exports = {
    name: "Participação dos Deputados em Eventos",
    describe: "Eventos nos quais a participação do deputado era ou é prevista.",

    command: crawl.stepByStep([
        { 'set': function() {
            return {
                deputados: Deputado.findAll({ attributes: ['idCamara'] })
                                   .map(d => d.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.deputados.map(deputy => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/deputados/' + deputy + '/eventos',
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

        // Associa Evento ao Deputado (ambos já carregados)
    ])
}
