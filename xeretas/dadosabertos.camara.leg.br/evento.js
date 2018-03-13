const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const crawl = require('../crawl.js');

const { Termo } = require('../../model');

module.exports = {
    name: "Evento",
    describe: "A Câmara e seus órgãos realizam vários tipos de eventos: seminários, " +
              "reuniões e sessões deliberativas para votar proposições, audiências " +
              "públicas com especialistas, palestras, diligências externas a diversos " +
              "lugares do país, entre outros. Além dos deputados integrantes dos órgãos " +
              "que promovem esses eventos, também podem participar autoridades e " +
              "representantes de empresas e instituições da sociedade.",

    command: function() {
        // Creates a map of all Termo instances, mapped to their idCamara.
        return Termo.findAll({ where: {
            tipo: { [Op.in]: ['tiposEvento', 'situacoesEvento'] }
        }}).then((termos) => {
            if (termos.length > 0) {
                // Services return the term name instead of the id.
                return termos.reduce((map, t) => {
                    map[t.tipo][t.nome] = t.id;
                    return map;
                }, { 'tiposEvento': {}, 'situacoesEvento': {} });

            } else {
                throw Error("References not available.");
            }

        }).then((termMaps) => {
            var crawler = crawl.json({
                request: {
                    url: 'https://dadosabertos.camara.leg.br/api/v2/eventos',
                    headers: {
                        'Accept': 'application/json',
                        'Accept-Charset': 'utf-8'
                    },
                    qs: {
                        'dataInicio': '1500-01-01',
                        'itens': 100,
                        'ordenarPor': 'id'
                    }
                },

                select: 'dados',

                schema: (scrape) => ({
                    idCamara: scrape('id').as.number(),
                    uri: scrape('uri').as.text(),
                    inicio: scrape('dataHoraInicio').as.date('YYYY/MM/DD/HH/mm'),
                    fim: scrape('dataHoraFim').as.date('YYYY/MM/DD/HH/mm'),
                    situacao: scrape('descricaoSituacao').as.mapped(termMaps['situacoesEvento']),
                    tipo: scrape('descricaoTipo').as.mapped(termMaps['tiposEvento']),
                    titulo: scrape('titulo').as.text(),
                    // localExterno: ?
                    orgaos: scrape('orgaos.id').as.number(),
                    localCamara: scrape('localCamara').as((scrape) => ({
                        nome: scrape('nome').as.text(),
                        predio: scrape('predio').as.text(),
                        andar: scrape('andar').as.text(),
                        sala: scrape('sala').as.text(),
                    }))
                }),

                promiseTo: (scraped, response) => {
                    console.debug("Got", JSON.stringify(scraped, 2));
                    return Promise.resolve(scraped);
                }
            });

            return crawler();
        });
    }
}
