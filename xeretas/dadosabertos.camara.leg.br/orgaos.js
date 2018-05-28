const { crawler, lookupReferenceEnum } = require('.');

const { Orgao } = require('memoria-politica-model');

module.exports = {
    name: "Órgão Legislativo",
    describe: "Os trabalhos da Câmara são exercidos pelos deputados em diversos órgãos " +
              "parlamentares: comissões que analisam e votam proposições, CPIs (Comissões " +
              "Parlamentares de Inquérito) que fazem investigações, a Mesa Diretora que " +
              "organiza os trabalhos e participa da administração de recursos da Câmara, " +
              "procuradorias, conselhos e o próprio Plenário, integrado por todos os " +
              "deputados e órgão supremo das decisões da casa.",
    weight: 250,
    command: crawler.stepByStep([
        { 'set': function() {
            return {
                tiposOrgao: lookupReferenceEnum('tiposOrgao')
            }
        }},

        { 'request': {
            url: '/orgaos/',
            qs: {
                itens: 100
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number()
            })
        }},

        { 'request': function(response) {
            return response.scraped.map(orgao => ({
                url: '/orgaos/' + orgao.idCamara
            }));
        }},

        { 'scrape': function() {
            return {
                schema: (scrape) => ({
                    // Gets the same properties as basic listing, just in case they changed.
                    idCamara: scrape('id').as.number(),
                    sigla: scrape('sigla').as.text(),
                    nome: scrape('nome').as.text(),
                    apelido: scrape('apelido').as.text(),
                    tipoId: scrape('idTipoOrgao').as.mapped(this.tiposOrgao),

                    dataInstalacao: scrape('dataInstalacao').as.date('YYYY/MM/DD/HH/mm'),
                    dataInicio: scrape('dataInicio').as.date('YYYY/MM/DD/HH/mm'),
                    dataFim: scrape('dataFim').as.date('YYYY/MM/DD/HH/mm'),
                    dataFimOriginal: scrape('dataFimOriginal').as.date('YYYY/MM/DD/HH/mm'),

                    casa: scrape('casa').as.text(),
                    sala: scrape('sala').as.text(),
                    website: scrape('urlWebsite').as.text()
                })
            }
        }},

        { 'createOrUpdate': {
            findOrCreate: function(orgao) {
                return Orgao.findOrCreate({
                    where: { 'idCamara': orgao.idCamara },
                    defaults: orgao
                }).then(([object, created]) => {
                    return [object, created, orgao];
                });
            }
        }}
    ])
}
