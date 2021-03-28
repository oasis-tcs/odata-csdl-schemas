//TODO:
// V2 service with alias, mix of namespace- and alias-qualified associations/sets
// V2 service with HttpMethod=POST
// UrlRef with nested annotation
// function overload with same name as type: detect collision, warn and continue gracefully

const assert = require("assert");
const fs = require("fs");

const csdl = require("../lib/xml2json");

const example1 = fs.readFileSync("examples/csdl-16.1.xml");
const result1 = require("../examples/csdl-16.1.json");

const example2 = fs.readFileSync("examples/csdl-16.2.xml");
const result2 = require("../examples/csdl-16.2.json");

const example3 = fs.readFileSync("examples/miscellaneous.xml");
const result3 = require("../examples/miscellaneous.json");

const example4 = fs.readFileSync("examples/miscellaneous2.xml");
const result4 = require("../examples/miscellaneous2.json");

const example5 = fs.readFileSync("examples/temporal.xml");
const result5 = require("../examples/temporal.json");

const example6 = fs.readFileSync("test/odata-rw-v2.xml");
const result6 = require("./odata-rw-v2.json");

const example7 = fs.readFileSync("test/odata-rw-v3.xml");
const result7 = require("./odata-rw-v3.json");

const example8 = fs.readFileSync("test/ReferentialConstraint-v2.xml");
const result8 = require("./ReferentialConstraint-v2.json");

const example9 = fs.readFileSync("test/documentation-v2.xml");
const result9 = require("./documentation-v2.json");

describe("Examples", function () {
  it("csdl-16.1", function () {
    assert.deepStrictEqual(csdl.xml2json(example1), result1, "CSDL JSON");
  });

  it("csdl-16.2", function () {
    assert.deepStrictEqual(csdl.xml2json(example2), result2, "CSDL JSON");
  });

  it("miscellaneous", function () {
    assert.deepStrictEqual(csdl.xml2json(example3), result3, "CSDL JSON");
  });

  it("miscellaneous2", function () {
    assert.deepStrictEqual(csdl.xml2json(example4), result4, "CSDL JSON");
  });

  it("temporal", function () {
    assert.deepStrictEqual(csdl.xml2json(example5), result5, "CSDL JSON");
  });

  it("odata-rw-v2", function () {
    assert.deepStrictEqual(csdl.xml2json(example6), result6, "CSDL JSON");
  });

  it("odata-rw-v3", function () {
    assert.deepStrictEqual(csdl.xml2json(example7), result7, "CSDL JSON");
  });

  it("ReferentialConstraint-v2", function () {
    assert.deepStrictEqual(csdl.xml2json(example8), result8, "CSDL JSON");
  });

  it("documentation-v2", function () {
    assert.deepStrictEqual(csdl.xml2json(example9), result9, "CSDL JSON");
  });

  it("empty <String> element", function () {
    //TODO: correct XML once checks are added
    const xml =
      '<Edmx Version=""><DataServices><Schema Namespace="n">' +
      ' <Annotation Term="String.NoBody"><String/></Annotation>' +
      ' <Annotation Term="String.EmptyBody"><String></String></Annotation>' +
      " </Schema></DataServices></Edmx>";
    const json = csdl.xml2json(xml);
    assert.deepStrictEqual(json.n["@String.NoBody"], "");
    assert.deepStrictEqual(json.n["@String.EmptyBody"], "");
  });

  it("<String> with line-breaks", function () {
    //TODO: correct XML once checks are added
    const xml =
      '<Edmx Version=""><DataServices><Schema Namespace="n">' +
      ' <Annotation Term="String.WithCRLF"><String>one\r\ntwo\r\nthree</String></Annotation>' +
      ' <Annotation Term="String.WithLF"><String>one\ntwo\nthree</String></Annotation>' +
      ' <Annotation Term="String.WithCR"><String>one\rtwo\rthree</String></Annotation>' +
      " </Schema></DataServices></Edmx>";
    const normalized = "one\ntwo\nthree";
    const json = csdl.xml2json(xml);
    assert.deepStrictEqual(json.n["@String.WithCRLF"], normalized);
    assert.deepStrictEqual(json.n["@String.WithLF"], normalized);
    assert.deepStrictEqual(json.n["@String.WithCR"], normalized);
  });

  it('<EnumMember Value="0"', function () {
    //TODO: correct XML once checks are added
    const xml =
      '<Edmx Version=""><DataServices><Schema Namespace="n">' +
      ' <EnumType Name="WithZeroValue"><Member Name="One" Value="1"/><Member Name="Zero" Value="0"/></EnumType>' +
      " </Schema></DataServices></Edmx>";
    const schema = {
      WithZeroValue: {
        $Kind: "EnumType",
        One: 1,
        Zero: 0,
      },
    };
    const json = csdl.xml2json(xml);
    assert.deepStrictEqual(json.n, schema);
  });

  it("with line numbers", function () {
    //TODO: correct XML once checks are added
    const xml = [
      '<Edmx Version="4.0">',
      "<DataServices>",
      '<Schema Namespace="n">',
      '<EnumType Name="WithZeroValue">\n<Member Name="One" Value="1"/>\n<Member Name="Zero" Value="0"/>\n</EnumType>',
      '<ComplexType Name="ct">',
      '<Property Name="p" Type="Edm.String"/>',
      "</ComplexType>",
      '<EntityType Name="et">',
      '<NavigationProperty Name="np" Type="n.et"/>',
      "</EntityType>",
      '<TypeDefinition Name="td" UnderlyingType="Edm.String"/>',
      '<Term Name="t" Type="Edm.String"/>',
      '<Action Name="a"/>',
      '<Function Name="f"/>',
      '<Annotation Term="Some.Collection">',
      "<Collection>",
      "<Record>",
      "</Record>",
      "</Collection>",
      "</Annotation>",
      '<Function Name="fp">',
      '<Parameter Name="fp1"',
      'Type="Edm.String"/>',
      '<ReturnType Type="n.ct"/>',
      "</Function>",
      "</Schema>",
      "</DataServices>",
      "</Edmx>",
    ].join("\n");
    const schema = {
      WithZeroValue: {
        $Kind: "EnumType",
        "@parser.line": 4,
        One: 1,
        "One@parser.line": 5,
        Zero: 0,
        "Zero@parser.line": 6,
      },
      ct: {
        $Kind: "ComplexType",
        "@parser.line": 8,
        p: {
          $Nullable: true,
          "@parser.line": 9,
        },
      },
      et: {
        $Kind: "EntityType",
        "@parser.line": 11,
        np: {
          $Kind: "NavigationProperty",
          $Nullable: true,
          $Type: "n.et",
          "@parser.line": 12,
        },
      },
      td: {
        $Kind: "TypeDefinition",
        $UnderlyingType: "Edm.String",
        "@parser.line": 14,
      },
      t: {
        $Kind: "Term",
        $Nullable: true,
        "@parser.line": 15,
      },
      a: [
        {
          $Kind: "Action",
          "@parser.line": 16,
        },
      ],
      f: [
        {
          $Kind: "Function",
          "@parser.line": 17,
        },
      ],
      "@Some.Collection": [
        {
          "@parser.line": 20,
        },
      ],
      fp: [
        {
          $Kind: "Function",
          "@parser.line": 24,
          $Parameter: [
            {
              $Name: "fp1",
              $Nullable: true,
              "@parser.line": 26,
            },
          ],
          $ReturnType: {
            $Type: "n.ct",
            $Nullable: true,
            "@parser.line": 27,
          },
        },
      ],
    };
    const json = csdl.xml2json(xml, true);
    assert.deepStrictEqual(json.n, schema, "schema");
  });

  it("Annotation (property) value of media type application/json", function () {
    //TODO: correct XML once checks are added
    const xml = `<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
               <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.xml">
                 <edmx:Include Namespace="Org.OData.Core.V1" Alias="C" />
               </edmx:Reference>
               <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.JSON.V1.xml">
                 <edmx:Include Namespace="Org.OData.JSON.V1" Alias="J" />
               </edmx:Reference>
               <edmx:DataServices>
                 <Schema Namespace="n">
                   <Annotations Target="Something.Else">
                     <Annotation Term="J.Schema">
                       <String>{"type":"object","additionalProperties":false,"patternProperties":{"^[0-9]{3}$":{"type":"string"}}}</String>
                     </Annotation>
                     <Annotation Term="Some.PrimitiveTerm">
                       <Annotation Term="C.MediaType" String="application/json" />
                       <String>{"a-b":"not a property name"}</String>
                     </Annotation>
                     <Annotation Term="C.MediaType" String="application/json" />
                     <Annotation Term="Some.StructuredTerm">
                       <Record>
                         <Annotation Term="C.MediaType" String="application/json" />
                         <PropertyValue Property="somestream">
                           <Annotation Term="C.MediaType" String="application/json" />
                           <String>{"a-b":"not a property name"}</String>
                         </PropertyValue>
                       </Record>
                     </Annotation>
                   </Annotations>
                 </Schema>
               </edmx:DataServices>
             </edmx:Edmx>`;
    const schema = {
      $Annotations: {
        "Something.Else": {
          "@C.MediaType": "application/json",
          "@J.Schema": {
            type: "object",
            additionalProperties: false,
            patternProperties: {
              "^[0-9]{3}$": {
                type: "string",
              },
            },
          },
          "@Some.PrimitiveTerm@C.MediaType": "application/json",
          "@Some.PrimitiveTerm": {
            "a-b": "not a property name",
          },
          "@Some.StructuredTerm": {
            "@C.MediaType": "application/json",
            somestream: {
              "a-b": "not a property name",
            },
            "somestream@C.MediaType": "application/json",
          },
        },
      },
    };
    const json = csdl.xml2json(xml);
    assert.deepStrictEqual(json.n, schema, "schema");
  });

  it("Function with same name as type", function () {
    //TODO: correct XML once checks are added
    const xml = `<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
               <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.xml">
                 <edmx:Include Namespace="Org.OData.Core.V1" Alias="C" />
               </edmx:Reference>
               <edmx:DataServices>
                 <Schema Namespace="collision">
                   <ComplexType Name="foo">
                     <Annotation Term="Core.Description" String="types win" />
                   </ComplexType>
                   <Action Name="foo" IsBound="true">
                     <Annotation Term="Core.Description" String="this one is ignored" />
                     <Parameter Name="it" Type="collision.foo" />
                   </Action>
                   <Action Name="foo" IsBound="true">
                     <Annotation Term="Core.Description" String="this one is ignored" />
                     <Parameter Name="it" Type="collision.bar" />
                   </Action>
                   <Action Name="bar">
                     <Annotation Term="Core.Description" String="this one is ignored" />
                     <Parameter Name="it" Type="collision.bar" />
                   </Action>
                   <Function Name="foo" IsBound="true">
                     <Annotation Term="Core.Description" String="this one is ignored" />
                     <Parameter Name="it" Type="collision.foo" />
                   </Function>
                   <Function Name="foo" IsBound="true">
                     <Annotation Term="Core.Description" String="this one is ignored" />
                     <Parameter Name="it" Type="collision.bar" />
                   </Function>
                   <Function Name="bar">
                     <Annotation Term="Core.Description" String="this one is ignored" />
                     <Parameter Name="it" Type="collision.bar" />
                   </Function>
                   <ComplexType Name="bar">
                     <Annotation Term="Core.Description" String="types win" />
                   </ComplexType>
                 </Schema>
               </edmx:DataServices>
             </edmx:Edmx>`;
    const schema = {
      foo: {
        $Kind: "ComplexType",
        "@Core.Description": "types win",
      },
      bar: {
        $Kind: "ComplexType",
        "@Core.Description": "types win",
      },
    };
    const json = csdl.xml2json(xml);
    assert.deepStrictEqual(json.collision, schema, "schema");
  });
});

describe("Error cases", function () {
  var consoleError;
  var error = [];

  beforeEach(() => {
    consoleError = console.error;
    console.error = (e) => error.push(e);
  });

  afterEach(() => {
    console.error = consoleError;
  });

  it("malformed xml", function () {
    const xml = `<kaputt>`;
    const json = csdl.xml2json(xml);
    assert.strictEqual(error.length, 1);
    const message = error[0].message.split("\n");
    assert.strictEqual(message[0], "Unclosed root tag");
  });

  it("no xml", function () {
    const xml = `kaputt`;
    try {
      const json = csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Text data outside of root node."
      );
      assert.deepStrictEqual(e.parser, {
        construct: "kaputt",
        line: 1,
        column: 6,
      });
    }
  });
});
