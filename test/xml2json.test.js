//TODO: UrlRef with nested annotation

const assert = require('assert');
const fs = require('fs');

const csdl = require('../lib/xml2json');

const example1 = fs.readFileSync('examples/csdl-16.1.xml');
const result1 = require('../examples/csdl-16.1.json');

const example2 = fs.readFileSync('examples/csdl-16.2.xml');
const result2 = require('../examples/csdl-16.2.json');

const example3 = fs.readFileSync('examples/miscellaneous.xml');
const result3 = require('../examples/miscellaneous.json');

const example4 = fs.readFileSync('examples/miscellaneous2.xml');
const result4 = require('../examples/miscellaneous2.json');

describe('Examples', function () {

    it('csdl-16.1', function () {
        assert.deepStrictEqual(csdl.xml2json(example1), result1);
    })

    it('csdl-16.2', function () {
        assert.deepStrictEqual(csdl.xml2json(example2), result2);
    })

    it('miscellaneous', function () {
        assert.deepStrictEqual(csdl.xml2json(example3), result3);
    })

    it('miscellaneous2', function () {
        assert.deepStrictEqual(csdl.xml2json(example4), result4);
    })

})