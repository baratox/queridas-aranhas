"use strict";

const crawl = require('../crawl.js');

const { Legislatura } = require('../../model');

module.exports = {
    name: "Bloco Partidário",
    describe: "Nas atividades parlamentares, partidos podem se juntar em blocos partidários. " +
              "Quando associados, os partidos passam a trabalhar como se fossem um 'partidão', " +
              "com um só líder e um mesmo conjunto de vice-líderes. Os blocos só podem existir " +
              "até o fim da legislatura em que foram criados: na legislatura seguinte, os mesmos " +
              "partidos, se associados, formam um novo bloco.",

     command: crawl.stepByStep([
        { 'set': function() {
            return {
                legislaturas: Legislatura.findAll({ attributes: ['idCamara'] })
                                         .map(l => l.get('idCamara'))
            }
        }},

        { 'request': function() {
            return this.legislaturas.map(l => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/blocos/',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Charset': 'utf-8'
                },
                qs: {
                    'idLegislatura': l,
                    'itens': 100
                }
            }));
        }},

        { 'scrape': {
            select: 'dados',
            schema: (scrape) => ({
                idCamara: scrape('id').as.number()
            })
        }},

        { 'request': function(response) {
            return response.scraped.map(bloco => ({
                url: 'https://dadosabertos.camara.leg.br/api/v2/orgaos/' + bloco.idCamara,
                headers: {
                    'Accept': 'application/json',
                    'Accept-Charset': 'utf-8'
                }
            }));
        }},

        { 'scrape': {
            select: 'dados'
        }}

    ])
}