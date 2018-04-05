const { crawler } = require('.');

const { Proposicao } = require('../../model');

module.exports = {
    name: "Proposições",
    describe: "Lista de informações básicas sobre projetos de lei, requerimentos, " +
              "medidas provisórias, emendas, pareceres e todos os outros tipos de " +
              "proposições na Câmara.",

    command: crawler.stepByStep([
        { 'request': function(legislatura) {
            return {
                url: '/proposicoes/',
                qs: {
                    'dataInicio': '2017-01-01',
                    'itens': 100
                }
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number(),
                uri: scrape('uri').as.text(),
                siglaTipo: scrape('siglaTipo').as.text(),
                idTipo: scrape('idTipo').as.number(),
                numero: scrape('numero').as.number(),
                ano: scrape('ano').as.number(),
                ementa: scrape('ementa').as.text(),
            }),
        }},

        { 'request': function(response) {
            return response.scraped.map(proposicao => ({
                url: '/proposicoes/' + proposicao.idCamara
            }));
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number(),
                uri: scrape('uri').as.text(),
                siglaTipo: scrape('siglaTipo').as.text(),
                idTipo: scrape('idTipo').as.number(),
                numero: scrape('numero').as.number(),
                ano: scrape('ano').as.number(),
                ementa: scrape('ementa').as.text(),
                dataApresentacao: scrape('dataApresentacao').as.date('YYYY-MM-DDTHH:mm'),
                uriOrgaoNumerador: null,
                uriUltimoRelator: null,
                statusProposicao: scrape('statusProposicao').as((scrape) => ({
                    dataHora: scrape('dataHora').as.date('YYYY-MM-DDTHH:mm'),
                    sequencia: scrape('sequencia').as.number(),
                    siglaOrgao: scrape('siglaOrgao').as.text(),
                    uriOrgao: scrape('uriOrgao').as.text(),
                    regime: scrape('regime').as.text(),
                    descricaoTramitacao: scrape('descricaoTramitacao').as.text(),
                    idTipoTramitacao: scrape('idTipoTramitacao').as.number(),
                    descricaoSituacao: scrape('descricaoSituacao').as.text(),
                    idSituacao: scrape('idSituacao').as.number(),
                    despacho: scrape('despacho').as.text(),
                    url: scrape('url').as.text(),
                })),
                tipoAutor: scrape('tipoAutor').as.text(),
                idTipoAutor: scrape('idTipoAutor').as.number(),
                uriAutores: scrape('uriAutores').as.text(),
                descricaoTipo: scrape('descricaoTipo').as.text(),
                ementaDetalhada: null,
                keywords: scrape('keywords').as.text(),
                uriPropPrincipal: null,
                uriPropAnterior: null,
                uriPropPosterior: null,
                urlInteiroTeor: scrape('urlInteiroTeor').as.text(),
                urnFinal: null,
                texto: null,
                justificativa: null,
            }),
        }},

        { 'createOrUpdate': {
            findOrCreate: function(proposicao) {
                return Proposicao.findOrCreate({
                    where: { 'idCamara': proposicao.idCamara },
                    defaults: proposicao
                });
            }
        }}
    ])
}
