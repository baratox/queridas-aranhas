"use strict";

const { crawler } = require('.');

const { Legislatura } = require('../../model');

module.exports = {
    name: "Bloco Partidário",
    describe: "Nas atividades parlamentares, partidos podem se juntar em blocos partidários. " +
              "Quando associados, os partidos passam a trabalhar como se fossem um 'partidão', " +
              "com um só líder e um mesmo conjunto de vice-líderes. Os blocos só podem existir " +
              "até o fim da legislatura em que foram criados: na legislatura seguinte, os mesmos " +
              "partidos, se associados, formam um novo bloco.",

     command: crawler.stepByStep([
        function() {
            return Legislatura.findAll({ attributes: ['idCamara'] })
                              .map(l => l.get('idCamara'))
        },

        { 'request': function(legislatura) {
            this.legislatura = legislatura;
            return {
                // Send parameter in the Url to avoid issues with pagination
                url: '/blocos/?idLegislatura=' + legislatura,
                qs: {
                    'itens': 100
                }
            };
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number()
            })
        }},

        { 'request': function(response) {
            return response.scraped.map(bloco => ({
                url: '/blocos/' + bloco.idCamara,
            }));
        }},

        { 'scrape': {
        }}
    ])
}