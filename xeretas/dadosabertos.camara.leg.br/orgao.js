const crawl = require('../crawl.js');

const { Orgao, Termo } = require('../../model');


function requestDetails(orgao, tiposOrgaoMap) {
    var crawler = crawl.json({
        request: {
            url: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/' + orgao.idCamara,
            headers: {
                'Accept': 'application/json',
                'Accept-Charset': 'utf-8'
            }
        },

        select: 'dados',

        schema: (scrape) => ({
            // Gets the same properties as basic listing, just in case they changed.
            idCamara: scrape('id').as.number(),
            sigla: scrape('sigla').as.text(),
            nome: scrape('nome').as.text(),
            apelido: scrape('apelido').as.text(),
            tipoId: scrape('idTipoOrgao').as.mapped(tiposOrgaoMap),

            dataInstalacao: scrape('dataInstalacao').as.date('YYYY/MM/DD/HH/mm'),
            dataInicio: scrape('dataInicio').as.date('YYYY/MM/DD/HH/mm'),
            dataFim: scrape('dataFim').as.date('YYYY/MM/DD/HH/mm'),
            dataFimOriginal: scrape('dataFimOriginal').as.date('YYYY/MM/DD/HH/mm'),

            casa: scrape('casa').as.text(),
            sala: scrape('sala').as.text(),
            website: scrape('urlWebsite').as.text()
        }),

        promiseTo: (scraped, response) => {
            return Promise.resolve(scraped);
        }
    });

    return crawler();
}

module.exports = {
    name: "Órgão Legislativo",
    describe: "Os trabalhos da Câmara são exercidos pelos deputados em diversos órgãos " +
              "parlamentares: comissões que analisam e votam proposições, CPIs (Comissões " +
              "Parlamentares de Inquérito) que fazem investigações, a Mesa Diretora que " +
              "organiza os trabalhos e participa da administração de recursos da Câmara, " +
              "procuradorias, conselhos e o próprio Plenário, integrado por todos os " +
              "deputados e órgão supremo das decisões da casa.",

    command: function() {
        // Creates a map of all Termo instances, mapped to their idCamara.
        return Termo.findAll({ where: { tipo: 'tiposOrgao' } })
        .then((termos) => {
            if (termos.length > 0) {
                return termos.reduce((map, t) => {
                    map[t.idCamara] = t.id;
                    return map;
                }, {});

            } else {
                throw Error("Reference for 'tiposOrgao' not available.");
            }

        }).then(tiposOrgaoMap => {
            var crawler = crawl.json({
                request: {
                    url: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/?itens=10',
                    headers: {
                        'Accept': 'application/json',
                        'Accept-Charset': 'utf-8'
                    }
                },

                select: 'dados',

                schema: (scrape) => ({
                    idCamara: scrape('id').as.number(),
                    sigla: scrape('sigla').as.text(),
                    nome: scrape('nome').as.text(),
                    apelido: scrape('apelido').as.text(),
                    tipoId: scrape('idTipoOrgao').as.mapped(tiposOrgaoMap)
                }),

                findOrCreate: function(orgao) {
                    return requestDetails(orgao, tiposOrgaoMap)
                    .then((detailed) => {
                        return Orgao.findOrCreate({
                            where: { 'idCamara': detailed.idCamara },
                            defaults: detailed
                        }).then(([object, created]) => {
                            return [object, created, detailed];
                        });
                    });
                }
            });

            return crawler();
        });
    }
}