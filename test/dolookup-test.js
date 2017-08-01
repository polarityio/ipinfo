/*
 * Copyright (c) 2017. Breach Intelligence, Inc.
 * All rights reserved
 */

'use strict';

let chai = require('chai');
let expect = chai.expect;
let nock = require('nock');
let integration = require('../integration');

describe('doLookup()', function () {
    before(function (done) {
        integration.startup({
            trace: function(){},
            info: function(){},
            debug: function(msg){console.info(msg)},
            error: function(){}
        });

        nock('https://www.virustotal.com/vtapi/v2/file/report')
            .post('/vtapi/v2/file/report')
            .query({
                "apiKey": 'fakekey',
                "resource": '7e3485f5edd48ffce37b0b0b735cd97f5ab514aa8dc4d6bc16cc4c40fb3fb570'
            })
            .reply(200,{
                    "scans": {
                        "Bkav": {
                            "detected": false,
                            "version": "1.3.0.9282",
                            "result": null,
                            "update": "20170727"
                        },
                        "MicroWorld-eScan": {
                            "detected": false,
                            "version": "12.0.250.0",
                            "result": null,
                            "update": "20170727"
                        },
                        "nProtect": {
                            "detected": false,
                            "version": "2017-07-27.01",
                            "result": null,
                            "update": "20170727"
                        }
                    },
                    "scan_id": "7e3485f5edd48ffce37b0b0b735cd97f5ab514aa8dc4d6bc16cc4c40fb3fb570-1501185873",
                    "sha1": "c21dc47d57437909f9cac14e786c77e9f3e78e56",
                    "resource": "7e3485f5edd48ffce37b0b0b735cd97f5ab514aa8dc4d6bc16cc4c40fb3fb570",
                    "response_code": 1,
                    "scan_date": "2017-07-27 20:04:33",
                    "permalink": "https://www.virustotal.com/file/7e3485f5edd48ffce37b0b0b735cd97f5ab514aa8dc4d6bc16cc4c40fb3fb570/analysis/1501185873/",
                    "verbose_msg": "Scan finished, information embedded",
                    "total": 62,
                    "positives": 0,
                    "sha256": "7e3485f5edd48ffce37b0b0b735cd97f5ab514aa8dc4d6bc16cc4c40fb3fb570",
                    "md5": "e87c6a38e61a712c48025a6ad54c1113"
                }
            );

        done();
    });

    it.only('should lookup hash', function (done) {
        integration.doLookup([{
            type: 'custom',
            types: ['custom.latLong'],
            value: '38.88,-77.00'
        }], {
            apiKey: 'fakekey',
            lookupIps: false,
            lookupFiles: true,
            isPrivateApi: false,
            showHashesWithNoDetections: true
        }, function (err, result) {
            console.info(JSON.stringify(result, null, 4));
            expect(err).to.be.null;
            let entity = {
                type: 'hash',
                types: ['hash', 'sha256'],
                value: '7e3485f5edd48ffce37b0b0b735cd97f5ab514aa8dc4d6bc16cc4c40fb3fb570',
                isSHA256: true,
                isHash: true
            };

            expect(result).to.deep.equal([
                    {
                        entity: entity,
                        data: {
                            summary: ["Southeast Fwy, Washington, DC 20003, USA"],
                            details: entity
                        }
                    }
                ]
            );
            done();
        });
    });
});
