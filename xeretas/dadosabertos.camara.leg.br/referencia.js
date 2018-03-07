const crawl = require('../crawl.js');

const { Termo } = require('../../model');

module.exports = {
    name: "Referência",
    describe: "Referências para siglas e conjuntos predeterminados de valores usados na " +
              "classificação de tipos de proposições, situações de andamento de eventos, " +
              "etc.",

    command: crawl.json({
        request: {
            url: [
                'https://dadosabertos.camara.leg.br/api/v2/referencias/situacoesDeputado',
                'https://dadosabertos.camara.leg.br/api/v2/referencias/situacoesEvento',
                'https://dadosabertos.camara.leg.br/api/v2/referencias/situacoesOrgao',
                'https://dadosabertos.camara.leg.br/api/v2/referencias/situacoesProposicao',
                'https://dadosabertos.camara.leg.br/api/v2/referencias/tiposEvento',
                'https://dadosabertos.camara.leg.br/api/v2/referencias/tiposOrgao',
                'https://dadosabertos.camara.leg.br/api/v2/referencias/tiposProposicao',
                'https://dadosabertos.camara.leg.br/api/v2/referencias/uf'
            ],
            headers: {
                'Accept': 'application/json',
                'Accept-Charset': 'utf-8'
            }
        },

        select: 'dados',

        schema: (scrape) => ({
            idCamara: scrape('id').as.text(),
            sigla: scrape('sigla').as.text(),
            nome: scrape('nome').as.text(),
            descricao: scrape('descricao').as.text()
        }),

        extendRecord: (termo, response) => {
            var path = response.request.uri.path;
            termo['tipo'] = path.substring(path.lastIndexOf('/') + 1);

            if (termo['idCamara'] == undefined || termo['idCamara'] == null) {
                termo['idCamara'] = termo['sigla'];
            }

            return termo;
        },

        findOrCreate: function(termo) {
            return Termo.findOrCreate({
                where: {
                    'tipo': termo.tipo,
                    'idCamara': termo.idCamara
                },
                defaults: termo
            });
        }
    })
}
