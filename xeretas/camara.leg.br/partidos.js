const request = require('request');
const Partido = require('../../model').Partido;
const crawlXml = require('../crawl-xml.js');

module.exports = {
    name: "Partidos",
    describe: "Partidos com representação na Câmara dos Deputados."
};

// Handles response
var handleResponse = crawlXml({
    select: 'partidos partido',

    // Parses a XML record into an object with Partido data
    parse: function($) {
        var t = (selector) => S($(selector).text()).collapseWhitespace();

        var p = {};
        p['sigla'] = t('siglaPartido').strip('*');
        p['nome'] = t('nomePartido');
        // TODO Parse dates
        // p['dataCriacao'] = $('dataCriacao').text();
        // p['dataExtincao'] = $('dataExtincao').text();
        return p;
    },

    // Finds a Partido object in the database that corresponds to the
    // record under review. If it does not exist, creates and saves it
    // to the database.
    findOrCreate: function(partido) {
        // TODO Validate on Sequelize
        return Partido.findOrCreate({ where: { 'sigla': partido.sigla },
                                      defaults: partido });
    }
});

// Request call parameters
module.exports.command = [
    request,
    'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterPartidosCD',
    handleResponse
];
