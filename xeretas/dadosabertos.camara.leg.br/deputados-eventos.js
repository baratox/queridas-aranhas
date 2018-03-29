const { crawler } = require('.');

const { Deputado } = require('../../model');

module.exports = {
    name: "Participação dos Deputados em Eventos",
    describe: "Eventos nos quais a participação do deputado era ou é prevista.",

    command: crawler.stepByStep([
        { 'set': function() {
            return {
                deputados: Deputado.findAll({ attributes: ['idCamara'] })
                                   .map(d => d.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.deputados.map(deputy => ({
                url: '/deputados/' + deputy + '/eventos',
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

        // Associa Evento ao Deputado (ambos já carregados)
    ])
}
