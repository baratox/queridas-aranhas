'use strict';

const Bottleneck = require("bottleneck");
const request = require('request-promise-native');

const crawler = require('../crawl.js');

const { Termo } = require('../../model');


// Limits concurrent requests to avoid DoS'ing the already slow official servers.
const limiter = new Bottleneck({
    maxConcurrent: 10,
    minTime: 300
}).on('error', function(error) {
    console.error("Job failed.", error);
})

// Default request options for the https://dadosabertos.camara.leg.br/
var requester = request.defaults({
    baseUrl: 'https://dadosabertos.camara.leg.br/api/v2/',
    headers: {
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8'
    }
})

module.exports.crawler = crawler.defaults({
    'request': {
        'request': limiter.wrap(function(options) {
            console.info("GET", options.url, options ? '? ' + JSON.stringify(options) : '');
            return requester(options);
        })
    },
    'scrape': {
        'select': 'dados',
        'describe': true
    }
})

function reduce(list, keyAttr, valueAttr = 'id') {
    if (list.length > 0) {
        return list.reduce((map, t) => {
            map[t[keyAttr]] = t[valueAttr];
            return map;
        }, {});

    } else {
        throw Error("Term References not available.");
    }
}

module.exports.lookupReferenceEnum = function(type, keyAttr = 'idCamara') {
    return Termo.findAll({ where: { tipo: type }})
                .then(termos => reduce(termos, keyAttr))
}