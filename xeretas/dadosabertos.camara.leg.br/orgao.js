const crawl = require('../crawl.js');

const { Orgao, Termo } = require('../../model');

module.exports = {
    name: "Órgão Legislativo",
    describe: "Os trabalhos da Câmara são exercidos pelos deputados em diversos órgãos " +
              "parlamentares: comissões que analisam e votam proposições, CPIs (Comissões " +
              "Parlamentares de Inquérito) que fazem investigações, a Mesa Diretora que " +
              "organiza os trabalhos e participa da administração de recursos da Câmara, " +
              "procuradorias, conselhos e o próprio Plenário, integrado por todos os " +
              "deputados e órgão supremo das decisões da casa.",

    command: function() {
        return Termo.findAll({ where: { tipo: 'tiposOrgao' } })
        // Creates a map of all Termo instances, mapped to their idCamara.
        .then((termos) => termos.reduce(
                (map, t) => {
                    map[t.idCamara] = t.id;
                    return map;
                }, {})
        ).then(tiposOrgaoMap => {
            var crawler = crawl.json({
                request: {
                    url: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/?itens=100&ordenarPor=ideComissao',
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
                    return Orgao.findOrCreate({
                        where: { 'idCamara': orgao.idCamara },
                        defaults: orgao
                    });
                }
            });

            return crawler();
        });
    }
}
