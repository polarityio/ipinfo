/*
 * Copyright (c) 2016. Breach Intelligence, Inc.
 * All rights reserved
 */

'use strict';

var chai = require('chai');
var expect = chai.expect;
var integration = require('../integration');

describe('validateOptions()', function () {
    before(function (done) {
        this.getOptionObject = function(apiKey){
            return {
                apiKey:{
                    value: apiKey
                }
            }
        };
        done();
    });

    it('should return an empty array if no errors', function(){
        integration.validateOptions(this.getOptionObject('kaljsdlkajsdkljas'), function(err, results){
            expect(Array.isArray(results)).to.be.true;
            expect(results.length).to.equal(0);
        });
    });

    it('should require valid apiKey (not a string)', function(){
        integration.validateOptions(this.getOptionObject(123123123123), function(err, results){
            expect(results).to.deep.equal([
                {
                    key: 'apiKey',
                    message: 'You must provide a VirusTotal API key'
                }
            ])
        });
    });


    it('should require valid apiKey', function () {
        integration.validateOptions(this.getOptionObject(''), function(err, results){
            expect(results).to.deep.equal([
                {
                    key: 'apiKey',
                    message: 'You must provide a VirusTotal API key'
                }
            ])
        });
    });

});
