const crawl = require('../crawl.js');

const { Legislatura } = require('../../model');

module.exports = {
    name: "Mesa Diretora",
    describe: "Quais deputados fizeram parte da Mesa Diretora em uma legislatura.",

    command: crawl.stepByStep([
        function() {
            return Legislatura.findAll({ attributes: ['idCamara'] });
        },

        { 'request': function(legislatura) {
            return {
                url: 'https://dadosabertos.camara.leg.br/api/v2/legislaturas/' +
                     legislatura.get('idCamara') + '/mesa',
                headers: {
                    'Accept': 'application/json',
                    'Accept-Charset': 'utf-8'
                }
            }
        }}
    ])
}
