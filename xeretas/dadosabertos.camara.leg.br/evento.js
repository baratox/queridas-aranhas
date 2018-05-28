const { crawler, lookupReferenceEnum } = require('.');

const { Termo } = require('memoria-politica-model');

module.exports = {
    name: "Evento",
    describe: "A Câmara e seus órgãos realizam vários tipos de eventos: seminários, " +
              "reuniões e sessões deliberativas para votar proposições, audiências " +
              "públicas com especialistas, palestras, diligências externas a diversos " +
              "lugares do país, entre outros. Além dos deputados integrantes dos órgãos " +
              "que promovem esses eventos, também podem participar autoridades e " +
              "representantes de empresas e instituições da sociedade.",
    weight: 250,
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
                idCamara: scrape('id').as.number(),
                uri: scrape('uri').as.text(),
                dataHoraInicio: scrape('dataHoraInicio').as.date('YYYY-MM-DDTHH:mm'),
                dataHoraFim: scrape('dataHoraFim').as.date('YYYY-MM-DDTHH:mm'),
                descricaoSituacao: scrape('descricaoSituacao').as.text(),
                descricaoTipo: scrape('descricaoTipo').as.text(),
                titulo: scrape('titulo').as.text(),
                localExterno: null,
                localCamara: scrape('localCamara').as((scrape) => ({
                    nome: scrape('nome').as.text(),
                    predio: null,
                    sala: null,
                    andar: null,
                })),
            }),
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
                    uriDeputados: null,
                    uriConvidados: null,
                    uri: scrape('uri').as.text(),
                    fases: null,
                    dataHoraInicio: scrape('dataHoraInicio').as.date('YYYY-MM-DD HH:mm:ss'),
                    dataHoraFim: scrape('dataHoraFim').as.date('YYYY-MM-DD HH:mm:ss'),
                    descricaoSituacao: scrape('descricaoSituacao').as.text(),
                    descricaoTipo: scrape('descricaoTipo').as.text(),
                    situacao: scrape('descricaoSituacao').as.mapped(this.situacoesEvento),
                    tipo: scrape('descricaoTipo').as.mapped(this.tiposEvento),
                    titulo: scrape('titulo').as.text(),
                    localExterno: null,
                    localCamara: scrape('localCamara').as((scrape) => ({
                        nome: scrape('nome').as.text(),
                        predio: null,
                        sala: null,
                        andar: null,
                    })),
                }),
            }
        }},
    ])
}
