const { crawler } = require('.');

const { Partido, Legislatura } = require.main.require('./model');

module.exports = {
    name: "Partidos",
    describe: "Partidos políticos que têm ou já tiveram deputados na Câmara.",
    weight: 250,
    command: crawler.stepByStep([
        { 'set': function() {
            return {
                legislaturas: Legislatura.findAll({ attributes: ['idCamara'] })
                                         .map(l => l.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.legislaturas.map(l => ({
                url: '/partidos/',
                qs: {
                    'idLegislatura': l,
                    'itens': 100
                }
            }));
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number()
            })
        }},

        { 'request': function(response) {
            return response.scraped.map(partido => ({
                url: '/partidos/' + partido.idCamara
            }));
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number(),
                sigla: scrape('sigla').as.text(),
                nome: scrape('nome').as.text(),
                uri: scrape('uri').as.text(),
                status: scrape('status').as((scrape) => ({
                    data: scrape('data').as.date(''),
                    idLegislatura: scrape('idLegislatura').as.number(),
                    situacao: scrape('situacao').as.text(),
                    totalPosse: scrape('totalPosse').as.number(),
                    totalMembros: scrape('totalMembros').as.number(),
                    uriMembros: scrape('uriMembros').as.text(),
                    lider: scrape('lider').as((scrape) => ({
                        uri: scrape('uri').as.text(),
                        nome: scrape('nome').as.text(),
                        siglaPartido: scrape('siglaPartido').as.text(),
                        uriPartido: scrape('uriPartido').as.text(),
                        uf: scrape('uf').as.text(),
                        idLegislatura: scrape('idLegislatura').as.number(),
                        urlFoto: scrape('urlFoto').as.text(),
                    })),
                })),
                numeroEleitoral: null,
                urlLogo: scrape('urlLogo').as.text(),
                urlWebSite: null,
                urlFacebook: null,
            })
        }}
    ])
}
