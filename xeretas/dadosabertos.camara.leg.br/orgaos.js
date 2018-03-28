const crawl = require('../crawl.js');

const { Orgao, Termo } = require('../../model');

function reduce(list, keyAttr, valueAttr = 'id') {
    if (list.length > 0) {
        return list.reduce((map, t) => {
            map[t[keyAttr]] = t[valueAttr];
            return map;
        }, {});

    } else {
        throw Error("References not available.");
    }
}

module.exports = {
    name: "Órgão Legislativo",
    describe: "Os trabalhos da Câmara são exercidos pelos deputados em diversos órgãos " +
              "parlamentares: comissões que analisam e votam proposições, CPIs (Comissões " +
              "Parlamentares de Inquérito) que fazem investigações, a Mesa Diretora que " +
              "organiza os trabalhos e participa da administração de recursos da Câmara, " +
              "procuradorias, conselhos e o próprio Plenário, integrado por todos os " +
              "deputados e órgão supremo das decisões da casa.",

     command: crawl.stepByStep([
        { 'set': function() {
            return {
                tiposOrgao: Termo.findAll({ where: { tipo: 'tiposOrgao' }})
                                 .then(termos => reduce(termos, 'idCamara'))
            }
        }},

        { 'request': {
            url: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/',
            headers: {
                'Accept': 'application/json',
                'Accept-Charset': 'utf-8'
            },
            qs: {
                itens: 10
            }
        }},

        { 'scrape': {
            select: 'dados',
            schema: (scrape) => ({
                idCamara: scrape('id').as.number()
            })
        }},

        { 'request': function(response) {
            return response.scraped.map(orgao => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/' + orgao.idCamara,
                headers: {
                    'Accept': 'application/json',
                    'Accept-Charset': 'utf-8'
                }
            }));
        }},

        { 'scrape': function() {
            return {
                select: 'dados',
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