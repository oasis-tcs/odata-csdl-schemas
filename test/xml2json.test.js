//TODO: 
// UrlRef with nested annotation
// function overload with same name as type: detect collision, warn and continue gracefully 

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

const example5 = fs.readFileSync('examples/temporal.xml');
const result5 = require('../examples/temporal.json');

const example6 = fs.readFileSync('test/odata-rw-v2.xml');
const result6 = require('./odata-rw-v2.json');

const example7 = fs.readFileSync('test/odata-rw-v3.xml');
const result7 = require('./odata-rw-v3.json');

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

    it('temporal', function () {
        assert.deepStrictEqual(csdl.xml2json(example5), result5);
    })

    it('odata-rw-v2', function () {
        assert.deepStrictEqual(csdl.xml2json(example6), result6);
    })

    it('odata-rw-v3', function () {
        assert.deepStrictEqual(csdl.xml2json(example7), result7);
    })

    it('empty <String> element', function () {
        //TODO: correct XML once checks are added
        const xml = '<Edmx Version=""><DataServices><Schema Namespace="n">'
            + ' <Annotation Term="String.NoBody"><String/></Annotation>'
            + ' <Annotation Term="String.EmptyBody"><String></String></Annotation>'
            + ' </Schema></DataServices></Edmx>';
        const json = csdl.xml2json(xml);
        assert.deepStrictEqual(json.n['@String.NoBody'], '');
        assert.deepStrictEqual(json.n['@String.EmptyBody'], '');
    })

})