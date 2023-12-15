'use strict';

const request = require('postman-request');
const _ = require('lodash');
const config = require('./config/config');
const async = require('async');
const fs = require('fs');
const countryLookup = require('country-code-lookup');
let { Address6 } = require('ip-address');

let Logger;
let requestDefault;

/**
 *
 * @param entities
 * @param options
 * @param cb
 */
function doLookup(entities, options, cb) {
  let lookupResults = [];
  let tasks = [];

  Logger.trace({ entities }, 'doLookup');

  // This block of code is specifically for testing sample enterprise data results:

  // const data = require('./test/test-ip-data.json');
  // return cb(null, [
  //   {
  //     entity: entities[0],
  //     data: {
  //       summary: getSummaryTags(data),
  //       details: data
  //     }
  //   }
  // ]);

  entities.forEach((entity) => {
    if (isValidIp(entity)) {
      //do the lookup
      let requestOptions = {
        uri: 'https://ipinfo.io/' + entity.value + '/json?token=' + options.accessToken,
        method: 'GET',
        json: true
      };

      Logger.debug({ uri: requestOptions }, 'Request URI');

      tasks.push(function (done) {
        requestDefault(requestOptions, function (error, res, body) {
          if (error)
            return done({
              error: error,
              entity: entity.value,
              detail: 'Error in Request'
            });

          Logger.trace({ statusCode: res.statusCode, body }, 'Lookup Result');

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
    if (err) return cb(err);

    const resultsWithoutContent = results.some((result) => !result || !result.entity);
    if (resultsWithoutContent.length) {
      return cb({
        error: 'Unexpected error from Results',
        detail: 'Unexpected error from Results',
        resultsWithoutContent
      });
    }

    results.forEach((result) => {
      /**
       There are strange 200 responses for some IPv6 results that look like this:
        ```
        body: {
          "ip": "2345:425:2ca1::567:5673:23b5",
          "readme": "https://ipinfo.io/missingauth"
        }
       ```

       and in other cases like this:

       ```
       body: {
        "ip": "2345:425:2ca1::567:5673:23b5",
        }
       ```

       We try to filter these out using the Object.keys length call
      **/
      if (!result.body || result.body.bogon || Object.keys(result.body).length <= 2) {
        lookupResults.push({
          entity: result.entity,
          data: null
        });
      } else {
        if (result.body.country) {
          let country = countryLookup.byIso(result.body.country);
          if (country) {
            result.body._fullCountryName = country.country;
          }
        }
        lookupResults.push({
          entity: result.entity,
          data: {
            summary: getSummaryTags(result.body),
            details: result.body
          }
        });
      }
    });

    Logger.trace({ lookupResults }, 'Lookup Results');

    cb(null, lookupResults);
  });
}

const isLoopBackIp = (entity) => {
  return entity.startsWith('127');
};

const isLinkLocalAddress = (entity) => {
  return entity.startsWith('169');
};

const isPrivateIP = (entity) => {
  return entity.isPrivateIP === true;
};

const isValidIp = (entity) => {
  if (entity.isIPv6) {
    try {
      // throws an error if the IP is not a valid IPv6
      let ipv6 = new Address6(entity.value);
    } catch (err) {
      return false;
    }

    return true;
  }
  return !(isLoopBackIp(entity.value) || isLinkLocalAddress(entity.value) || isPrivateIP(entity));
};

function isUpperCase(str) {
  return str === str.toUpperCase();
}

function getSummaryTags(body) {
  const tags = [];

  if (body.privacy && body.privacy.vpn) {
    tags.push('VPN');
  }

  if (body.privacy && body.privacy.proxy) {
    tags.push('Proxy');
  }

  if (body.privacy && body.privacy.tor) {
    tags.push('Tor');
  }

  if (body.privacy && body.privacy.hosting) {
    tags.push('Hosting');
  }

  if (body.org) {
    // The `org` property is only on the free plan and includes both the ASN# and org info
    // For example, "AS15169 Google LLC"
    // we only want the org info so we split off the ASN#
    let tokens = body.org.split(' ');
    if (tokens.length > 1) {
      let orgName = tokens.slice(1).join(' ');
      // some org names are in all uppercase which looks bad so we make those lowercase
      if (isUpperCase(orgName)) {
        tags.push(orgName.toLowerCase());
      } else {
        tags.push(orgName);
      }
    }
  } else if (body.asn && body.asn.name) {
    // paid plans use the more details asn object
    // some org names are in all uppercase which looks bad so we make those lowercase
    if (isUpperCase(body.asn.name)) {
      tags.push(body.asn.name.toLowerCase());
    } else {
      tags.push(body.asn.name);
    }
  }

  if (body.country) {
    let country = countryLookup.byIso(body.country);
    if (country) {
      // this is the full country name
      tags.push(country.country);
    } else {
      // this is the 2 digit code provided by IPInfo
      tags.push(body.country);
    }
  }

  return tags;
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
