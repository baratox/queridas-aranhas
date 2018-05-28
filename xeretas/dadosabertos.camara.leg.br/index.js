'use strict';

const _ = require('lodash');
const Bottleneck = require("bottleneck");
const request = require('request-promise-native');

const crawler = require.main.require('./util/crawler.js');

const { Termo } = require('memoria-politica-model');

// Limits concurrent requests to avoid DoS'ing the already slow official servers.
const limiter = new Bottleneck({
    maxConcurrent: 10,
    minTime: 100
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
            console.info("    HTTP GET", options.url, options.qs ? '? ' + JSON.stringify(options.qs) : '');
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

module.exports.printSwaggerResponse = function(response) {
    var data = {}

    if (response) {
        data = {
            successful: /^2/.test('' + response.statusCode),
            status: response.statusCode,
            date: new Date(_.get(response, 'headers.date')),
            total: _.parseInt(_.get(response, 'headers.x-total-count', '-1')),
            contentType: _.get(response, 'headers.content-type'),
        }

        var link = _.get(response, 'headers.link', '').split(",")
                    .filter((link) => link.match(/rel="last"/));
        if (link.length > 0) {
            data.pages = new RegExp(/pagina=(\d+)/).exec(link[0])[1];
        }

    } else {
        data.successful = false;
    }

    if (data.successful) {
        var status = data.status != 200 ? "(" + data.status + ") " : '';
        if (data.total > 0 && data.pages) {
            console.log("Successful " + status + "request to " + response.request.uri.path,
                "found", data.total, "in", data.pages, "page(s).");
        } else {
            console.log("Successful " + status + "request to " + response.request.uri.path,
                "found", data.total);
        }

    } else {
        console.log("Failed request to " + response.request.uri.path,
            "with status", data.status);
    }

    return response;
}
