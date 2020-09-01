'use strict';

let request = require('request');
let _ = require('lodash');
let util = require('util');
let net = require('net');
let config = require('./config/config');
let async = require('async');
let fs = require('fs');
let { Address6 } = require('ip-address');
let Logger;
let requestDefault;


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
        let isValid = true;
        if(entity.isIPv6 && new Address6(entity.value).isValid() === false){
            isValid = false;
        }
        if(!entity.isPrivateIP && !IGNORED_IPS.has(entity.value) && isValid){
            //do the lookup
            let requestOptions = {
                uri: 'https://ipinfo.io/' + entity.value + '/json?token=' + options.accessToken,
                method: 'GET',
                json: true
            };

            Logger.debug({uri: requestOptions}, 'Request URI');

            tasks.push(function (done) {
                requestDefault(requestOptions, function (error, res, body) {
                    if (error)
                        return done({
                            error: error,
                            entity: entity.value,
                            detail: 'Error in Request'
                        });

                    if (res.statusCode === 200) {
                        return done(null, {
                            entity: entity,
                            body: body
                        });
                    } else if (res.statusCode === 429) {
                        // reached rate limit
                        return done({
                            error: 'Reached Daily Lookup Limit',
                            httpStatus: res.statusCode,
                            body: body,
                            detail: 'Reached Daily Lookup Limit',
                            entity: entity.value
                        });
                    }

                    // Non 200 status code
                    return done({
                        error: error,
                        httpStatus: res.statusCode,
                        body: body,
                        detail: 'Unexpected Non 200 HTTP Status Code',
                        entity: entity.value
                    });
                });
            });
        }
    });

    async.parallelLimit(tasks, 10, (err, results) => {
        if (err)
            return cb(err);

        const resultsWithouContent = results.some((result) => !result || !result.entity);
        if (resultsWithouContent.length) {
            return cb({
                error: 'Unexpected error from Results',
                detail: 'Unexpected error from Results',
                resultsWithouContent
            });
        }

        results.forEach(result => {
            if(result.bogon || !result.body){
                lookupResults.push({
                    entity: result.entity,
                    data: null
                });
            } else {
                lookupResults.push({
                    entity: result.entity,
                    data: {
                        summary: [
                            ...(result.body.org ? [result.body.org] : []),
                            ...(result.body.region || result.body.city || result.body.country
                                ? [[result.body.city, result.body.region, result.body.country]
                                    .filter((val) => val)
                                    .join(', ')
                                ]
                                : [])
                        ],
                        details: result.body
                    }
                });
            }
        });

        Logger.trace({ lookupResults }, 'Lookup Results');

        cb(null, lookupResults);
    });
}

function startup(logger) {
    Logger = logger;

    let defaults = {};

    if (typeof config.request.cert === 'string' && config.request.cert.length > 0) {
        defaults.cert = fs.readFileSync(config.request.cert);
    }

    if (typeof config.request.key === 'string' && config.request.key.length > 0) {
        defaults.key = fs.readFileSync(config.request.key);
    }

    if (typeof config.request.passphrase === 'string' && config.request.passphrase.length > 0) {
        defaults.passphrase = config.request.passphrase;
    }

    if (typeof config.request.ca === 'string' && config.request.ca.length > 0) {
        defaults.ca = fs.readFileSync(config.request.ca);
    }

    if (typeof config.request.proxy === 'string' && config.request.proxy.length > 0) {
        defaults.proxy = config.request.proxy;
    }

    requestDefault = request.defaults(defaults);
}

module.exports = {
    doLookup: doLookup,
    startup: startup
};