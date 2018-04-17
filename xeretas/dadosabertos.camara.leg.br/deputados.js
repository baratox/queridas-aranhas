const { crawler } = require('.');

const { Legislatura } = require.main.require('./model');

module.exports = {
    name: "Deputados",
    describe: "Os representantes do povo são os principais agentes da Câmara — " +
              "como autores de proposições, membros de órgãos, etc. A quantidade " +
              "de votos recebidos nas eleições determinam se eles serão titulares " +
              "ou suplentes no exercício dos mandatos, que são as vagas que um " +
              "partido obtém para cada legislatura.",
    weight: 250,
    command: crawler.stepByStep([
        function() {
            return Legislatura.findAll({ attributes: ['idCamara'] })
                              .map(l => l.get('idCamara'))
        },

        { 'request': function(legislatura) {
            this.legislatura = legislatura;
            return {
                url: '/deputados/?idLegislatura=' + legislatura,
                qs: {
                    'itens': 100
                }
            }
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number(),
                uri: scrape('uri').as.text(),
                nome: scrape('nome').as.text(),
                siglaPartido: scrape('siglaPartido').as.text(),
                uriPartido: scrape('uriPartido').as.text(),
                siglaUf: scrape('siglaUf').as.text(),
                idLegislatura: scrape('idLegislatura').as.number(),
                urlFoto: scrape('urlFoto').as.text(),
            })
        }},

        { 'request': function(response) {
            return response.scraped.map(deputado => ({
                url: '/deputados/' + deputado.idCamara,
            }));
        }},

        { 'scrape': {
            schema: (scrape) => ({
                idCamara: scrape('id').as.number(),
                uri: scrape('uri').as.text(),
                nomeCivil: scrape('nomeCivil').as.text(),
                cpf: scrape('cpf').as.text(),
                sexo: scrape('sexo').as.text(),
                urlWebsite: scrape('urlWebsite').as.text(),
                dataNascimento: scrape('dataNascimento').as.date('YYYY-MM-DD'),
                dataFalecimento: scrape('dataFalecimento').as.date('YYYY-MM-DD'),
                ufNascimento: scrape('ufNascimento').as.text(),
                municipioNascimento: scrape('municipioNascimento').as.text(),
                escolaridade: scrape('escolaridade').as.text(),
                ultimoStatus: scrape('ultimoStatus').as((scrape) => ({
                    idCamara: scrape('id').as.number(),
                    uri: scrape('uri').as.text(),
                    nome: scrape('nome').as.text(),
                    siglaPartido: scrape('siglaPartido').as.text(),
                    uriPartido: scrape('uriPartido').as.text(),
                    siglaUf: scrape('siglaUf').as.text(),
                    idLegislatura: scrape('idLegislatura').as.number(),
                    urlFoto: scrape('urlFoto').as.text(),
                    data: scrape('data').as.date('YYYY-MM-DD'),
                    nomeEleitoral: scrape('nomeEleitoral').as.text(),
                    gabinete: scrape('gabinete').as((scrape) => ({
                        nome: scrape('nome').as.number(),
                        predio: scrape('predio').as.text(),
                        predio: scrape('predio').as.number(),
                        sala: scrape('sala').as.number(),
                        andar: scrape('andar').as.number(),
                        telefone: scrape('telefone').as.text(),
                        email: scrape('email').as.text(),
                    })),
                    situacao: scrape('situacao').as.text(),
                    condicaoEleitoral: scrape('condicaoEleitoral').as.text(),
                    descricaoStatus: scrape('descricaoStatus').as.text(),
                })),
            })
        }}
    ])
}
