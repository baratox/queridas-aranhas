const { crawler, lookupReferenceEnum } = require('.');

const { Termo } = require('../../model');

module.exports = {
    name: "Evento",
    describe: "A Câmara e seus órgãos realizam vários tipos de eventos: seminários, " +
              "reuniões e sessões deliberativas para votar proposições, audiências " +
              "públicas com especialistas, palestras, diligências externas a diversos " +
              "lugares do país, entre outros. Além dos deputados integrantes dos órgãos " +
              "que promovem esses eventos, também podem participar autoridades e " +
              "representantes de empresas e instituições da sociedade.",

    command: crawler.stepByStep([
        { 'set': function() {
            return {
                tiposEvento: lookupReferenceEnum('tiposEvento', 'nome'),
                situacoesEvento: lookupReferenceEnum('situacoesEvento', 'nome')
            }
        }},

        { 'request': {
            url: '/eventos',
            qs: {
                'dataInicio': '1500-01-01',
                'itens': 100,
                'ordenarPor': 'id'
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number()
            })
        }},

        { 'request': function(response) {
            return response.scraped.map(evento => ({
                url: '/eventos/' + evento.idCamara
            }));
        }},

        { 'scrape': function() {
            return {
                schema: (scrape) => ({
                    idCamara: scrape('id').as.number(),
                    uri: scrape('uri').as.text(),
                    inicio: scrape('dataHoraInicio').as.date('YYYY/MM/DD/HH/mm'),
                    fim: scrape('dataHoraFim').as.date('YYYY/MM/DD/HH/mm'),
                    situacao: scrape('descricaoSituacao').as.mapped(this.situacoesEvento),
                    tipo: scrape('descricaoTipo').as.mapped(this.tiposEvento),
                    titulo: scrape('titulo').as.text(),
                    // localExterno: ?
                    orgaos: scrape('orgaos.id').as.number(),
                    localCamara: scrape('localCamara').as((scrape) => ({
                        nome: scrape('nome').as.text(),
                        predio: scrape('predio').as.text(),
                        andar: scrape('andar').as.text(),
                        sala: scrape('sala').as.text(),
                    }))
                })
            }
        }},

        { 'createOrUpdate': {
        }}
    ])
}
