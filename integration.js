'use strict';

let request = require('request');
let _ = require('lodash');
let util = require('util');
let net = require('net');
let config = require('./config/config');
let async = require('async');
let fs = require('fs');
let Logger;

let requestOptionsIp = {};

const IGNORED_IPS = new Set([
    '127.0.0.1',
    '255.255.255.255',
    '0.0.0.0'
]);

/**
 *
 * @param entities
 * @param options
 * @param cb
 */
function doLookup(entities, options, cb) {
    let lookupResults = [];
    let tasks = [];

    Logger.trace(entities);

    entities.forEach(entity => {
        if(!entity.isPrivateIP && !IGNORED_IPS.has(entity.value)){
            //do the lookup
            requestOptionsIp.uri = 'https://ipinfo.io/' + entity.value + '/json?token=' + options.accessToken;
            requestOptionsIp.method = 'GET';
            requestOptionsIp.json = true;

            Logger.debug({uri: requestOptionsIp}, 'Request URI');
            tasks.push(function (done) {
                request(requestOptionsIp, function (error, res, body) {
                    let result = {};
                    if (res.statusCode === 200) {
                        result = {
                            entity: entity,
                            body: body
                        };
                    } else if (res.statusCode === 429) {
                        // reached rate limit
                        error = "Reached Daily Lookup Limit";
                    }

                    done(error, result);
                });
            });
        }
    });

    async.parallelLimit(tasks, 10, (err, results) => {
        if (err) {
            cb(err);
            return;
        }

        results.forEach(result => {
            if(result.bogon){
                lookupResults.push({
                    entity:result.entity,
                    data: null
                });
            }else{
                let summary = [];
                let geo = '';

                if(result.body && result.body.region){
                    geo = result.body.region;
                }

                if(result.body && result.body.country){
                    geo += ', ' + result.body.country;
                    summary.push(geo);
                }

                lookupResults.push({
                    entity: result.entity,
                    data: {
                        summary: summary,
                        details: result.body
                    }
                });
            }
        });

        cb(null, lookupResults);
    });
}

function startup(logger) {
    Logger = logger;

    if (typeof config.request.cert === 'string' && config.request.cert.length > 0) {
        requestOptionsIp.cert = fs.readFileSync(config.request.cert);
    }

    if (typeof config.request.key === 'string' && config.request.key.length > 0) {
        requestOptionsIp.key = fs.readFileSync(config.request.key);
    }

    if (typeof config.request.passphrase === 'string' && config.request.passphrase.length > 0) {
        requestOptionsIp.passphrase = config.request.passphrase;
    }

    if (typeof config.request.ca === 'string' && config.request.ca.length > 0) {
        requestOptionsIp.ca = fs.readFileSync(config.request.ca);
    }

    if (typeof config.request.proxy === 'string' && config.request.proxy.length > 0) {
        requestOptionsIp.proxy = config.request.proxy;
    }
}

function validateOptions(userOptions, cb) {
    let errors = [];
    if (typeof userOptions.accessToken.value !== 'string' ||
        (typeof userOptions.accessToken.value === 'string' && userOptions.accessToken.value.length === 0)) {
        errors.push({
            key: 'accessToken',
            message: 'You must provide an ipinfo access token'
        })
    }

    cb(null, errors);
}

module.exports = {
    doLookup: doLookup,
    startup: startup,
    validateOptions: validateOptions
};