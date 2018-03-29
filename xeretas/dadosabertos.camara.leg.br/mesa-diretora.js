const { crawler } = require('.');

const { Legislatura } = require('../../model');

module.exports = {
    name: "Mesa Diretora",
    describe: "Quais deputados fizeram parte da Mesa Diretora em uma legislatura.",

    command: crawler.stepByStep([
        function() {
            return Legislatura.findAll({ attributes: ['idCamara'] });
        },

        { 'request': function(legislatura) {
            return {
                url: '/legislaturas/' + legislatura.get('idCamara') + '/mesa'
            }
        }},

        { 'scrape': {

        }}
    ])
}
