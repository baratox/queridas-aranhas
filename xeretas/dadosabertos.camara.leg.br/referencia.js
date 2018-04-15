const { crawler } = require('.');
const { Termo } = require.main.require('./model');

module.exports = {
    name: "Referência",
    describe: "Referências para siglas e conjuntos predeterminados de valores usados na " +
              "classificação de tipos de proposições, situações de andamento de eventos, " +
              "etc.",

    command: crawler.stepByStep([
        { 'request': {
            url: [
                '/referencias/situacoesDeputado',
                '/referencias/situacoesEvento',
                '/referencias/situacoesOrgao',
                '/referencias/situacoesProposicao',
                '/referencias/tiposEvento',
                '/referencias/tiposOrgao',
                '/referencias/tiposProposicao',
                '/referencias/uf'
            ]
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.text(),
                sigla: scrape('sigla').as.text(),
                nome: scrape('nome').as.text(),
                descricao: scrape('descricao').as.text()
            })
        }},

        { 'createOrUpdate': {
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
        }}
    ])
}
