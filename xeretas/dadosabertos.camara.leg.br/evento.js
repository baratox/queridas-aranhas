const crawl = require('../crawl.js');

const { Termo } = require('../../model');

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
    name: "Evento",
    describe: "A Câmara e seus órgãos realizam vários tipos de eventos: seminários, " +
              "reuniões e sessões deliberativas para votar proposições, audiências " +
              "públicas com especialistas, palestras, diligências externas a diversos " +
              "lugares do país, entre outros. Além dos deputados integrantes dos órgãos " +
              "que promovem esses eventos, também podem participar autoridades e " +
              "representantes de empresas e instituições da sociedade.",

    command: crawl.stepByStep([
        { 'set': function() {
            return {
                tiposEvento: Termo.findAll({ where: { tipo: 'tiposEvento' }})
                                  .then(termos => reduce(termos, 'nome')),
                situacoesEvento: Termo.findAll({ where: { tipo: 'situacoesEvento' }})
                                      .then(termos => reduce(termos, 'nome'))
            }
        }},

        { 'request': {
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
        }},

        { 'request': function(response) {
            return response.scraped.map(evento => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/eventos/' + evento.idCamara,
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
                    idCamara: scrape('id').as.number(),
                    uri: scrape('uri').as.text(),
                    inicio: scrape('dataHoraInicio').as.date('YYYY/MM/DD/HH/mm'),
                    fim: scrape('dataHoraFim').as.date('YYYY/MM/DD/HH/mm'),
                    situacao: scrape('descricaoSituacao').as.mapped(this.situacoesEvento),
                    tipo: scrape('descricaoTipo').as.mapped(this.tiposEvento),
                    titulo: scrape('titulo').as.text(),
                    // localExterno: ?
                    orgaos: scrape('orgaos.id').as.number(),
                    localCamara: scrape('localCamara').as((scrape) => ({
                        nome: scrape('nome').as.text(),
                        predio: scrape('predio').as.text(),
                        andar: scrape('andar').as.text(),
                        sala: scrape('sala').as.text(),
                    }))
                })
            }
        }},

        { 'createOrUpdate': {
            promiseTo: (scraped, response) => {
                return Promise.resolve(scraped);
            }
        }}
    ])
}
