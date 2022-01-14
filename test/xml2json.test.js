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

  it("odata-rw-v2", function () {
    assert.deepStrictEqual(csdl.xml2json(example6), result6, "CSDL JSON");
  });

  it("odata-rw-v3", function () {
    assert.deepStrictEqual(
      csdl.xml2json(example7, false, true),
      result7,
      "CSDL JSON"
    );
  });

  it("ReferentialConstraint-v2", function () {
    assert.deepStrictEqual(
      csdl.xml2json(example8, false, true),
      result8,
      "CSDL JSON"
    );
  });

  it("documentation-v2", function () {
    assert.deepStrictEqual(csdl.xml2json(example9), result9, "CSDL JSON");
  });

  it("empty <String> element", function () {
    const xml = `<Edmx Version="4.01" xmlns="http://docs.oasis-open.org/odata/ns/edmx"><DataServices><Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                   <Annotation Term="String.NoBody"><String/></Annotation>
                   <Annotation Term="String.EmptyBody"><String></String></Annotation>
                 </Schema></DataServices></Edmx>`;
    const json = csdl.xml2json(xml);
    assert.deepStrictEqual(json.n["@String.NoBody"], "");
    assert.deepStrictEqual(json.n["@String.EmptyBody"], "");
  });

  it("<String> with line-breaks", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx"><DataServices><Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                   <Annotation Term="String.WithCRLF"><String>one\r\ntwo\r\nthree</String></Annotation>
                   <Annotation Term="String.WithLF"><String>one\ntwo\nthree</String></Annotation>
                   <Annotation Term="String.WithCR"><String>one\rtwo\rthree</String></Annotation>
                   </Schema></DataServices></Edmx>`;
    const normalized = "one\ntwo\nthree";
    const json = csdl.xml2json(xml);
    assert.deepStrictEqual(json.n["@String.WithCRLF"], normalized);
    assert.deepStrictEqual(json.n["@String.WithLF"], normalized);
    assert.deepStrictEqual(json.n["@String.WithCR"], normalized);
  });

  it('<EnumMember Value="0"', function () {
    const xml =
      '<Edmx Version="5.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx"><DataServices><Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">' +
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
    const xml = [
      '<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">',
      "<edmx:DataServices>",
      '<Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">',
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
      '<Function Name="f"><ReturnType Type="Edm.Boolean" /></Function>',
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
      "</edmx:DataServices>",
      "</edmx:Edmx>",
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
          $ReturnType: {
            $Nullable: true,
            $Type: "Edm.Boolean",
            "@parser.line": 17,
          },
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
    const xml = `<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                  <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.xml">
                    <edmx:Include Namespace="Org.OData.Core.V1" Alias="C" />
                  </edmx:Reference>
                  <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.JSON.V1.xml">
                    <edmx:Include Namespace="Org.OData.JSON.V1" Alias="J" />
                  </edmx:Reference>
                  <edmx:DataServices>
                    <Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">
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
    const xml = `<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                  <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.xml">
                    <edmx:Include Namespace="Org.OData.Core.V1" Alias="C" />
                  </edmx:Reference>
                  <edmx:DataServices>
                    <Schema Namespace="collision" xmlns="http://docs.oasis-open.org/odata/ns/edm">
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
                        <ReturnType Type="Edm.Boolean" />
                      </Function>
                      <Function Name="foo" IsBound="true">
                        <Annotation Term="Core.Description" String="this one is ignored" />
                        <Parameter Name="it" Type="collision.bar" />
                        <ReturnType Type="Edm.Boolean" />
                      </Function>
                      <Function Name="bar">
                        <Annotation Term="Core.Description" String="this one is ignored" />
                        <Parameter Name="it" Type="collision.bar" />
                        <ReturnType Type="Edm.Boolean" />
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
  it("malformed xml", function () {
    const xml = `<Edmx Version="4.0">`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(e.message.split("\n")[0], "Unclosed root tag");
      assert.deepStrictEqual(e.parser, {
        construct: '<Edmx Version="4.0">',
        line: 1,
        column: 20,
      });
    }
  });

  it("no xml", function () {
    const xml = `kaputt`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Non-whitespace before first tag."
      );
      assert.deepStrictEqual(e.parser, {
        construct: "k",
        column: 1,
        line: 1,
      });
    }
  });

  it("unexpected element", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices>
        <Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">
          <foo/>
        </Schema>
      </DataServices>
    </Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Schema, unexpected child: foo"
      );
      assert.deepStrictEqual(e.parser, {
        construct: "<foo/>",
        line: 4,
        column: 16,
      });
    }
  });

  it("unexpected text content", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">X
      <DataServices/>
    </Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Edmx, unexpected text: X"
      );
      assert.deepStrictEqual(e.parser, {
        construct: "<DataServices/",
        line: 2,
        column: 20,
      });
    }
  });

  it("unexpected element in annotation", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices>
        <Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">
          <Annotation Term="Unknown.Element"><!--next element is unexpected--><string/></Annotation>
        </Schema>
      </DataServices>
    </Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Annotation, unexpected child: string"
      );
      assert.deepStrictEqual(e.parser, {
        construct: "<string/>",
        line: 4,
        column: 87,
      });
    }
  });

  it("missing Nullable in Collection", function () {
    const xml = `<Edmx Version="4.01" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices>
        <Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">
          <Term Name="Annotation" Type="Collection(Edm.String)"/>
        </Schema>
      </DataServices>
    </Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Term, Type=Collection without Nullable attribute"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Term Name="Annotation" Type="Collection(Edm.String)"/>',
        line: 4,
        column: 65,
      });
    }
  });

  it("misplaced element", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <Schema Namespace="n">
      </Schema>
    </Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Edmx, unexpected child: Schema"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Schema Namespace="n">',
        line: 2,
        column: 28,
      });
    }
  });

  it("misplaced element, short notation", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <Annotation />
    </Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Edmx, unexpected child: Annotation"
      );
      assert.deepStrictEqual(e.parser, {
        construct: "<Annotation />",
        line: 2,
        column: 20,
      });
    }
  });

  it("element occurs too often", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices><Schema Namespace="foo" xmlns="http://docs.oasis-open.org/odata/ns/edm"/></DataServices>
      <DataServices/>
    </Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element DataServices: 2 occurrences instead of at most 1"
      );
      assert.deepStrictEqual(e.parser, {
        construct: "<DataServices/>",
        line: 3,
        column: 21,
      });
    }
  });

  it("too few child expressions", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices>
        <Schema Namespace="foo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
          <Annotation Term="foo.bar">
            <Eq>
              <String>foo</String>
            </Eq>
          </Annotation>
        </Schema>
      </DataServices>
    </Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Eq, child element expression: 1 occurrences instead of at least 2"
      );
      assert.deepStrictEqual(e.parser, {
        construct: "</Eq>",
        line: 7,
        column: 17,
      });
    }
  });

  it("too many child expressions", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices>
        <Schema Namespace="foo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
          <Annotation Term="foo.bar">
            <Eq>
              <String>foo</String>
              <Bool>true</Bool>
              <String>foo</String>
            </Eq>
          </Annotation>
        </Schema>
      </DataServices>
    </Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element expression: 3 occurrences instead of at most 2"
      );
      assert.deepStrictEqual(e.parser, {
        construct: "<String>",
        line: 8,
        column: 22,
      });
    }
  });

  it("required element is missing", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx"></Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Edmx, child element DataServices: 0 occurrences instead of at least 1"
      );
      assert.deepStrictEqual(e.parser, {
        construct: "</Edmx>",
        line: 1,
        column: 76,
      });
    }
  });

  it("V2 element in V4", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices>
        <Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">
          <Association Name="NotInV4" />
        </Schema>
      </DataServices>
    </Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Unexpected element: Association"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Association Name="NotInV4" />',
        line: 4,
        column: 40,
      });
    }
  });

  it("element in V2 place in V4", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices>
        <Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">
          <EntityContainer Name="container">
            <FunctionImport Name="fi" Function="f">
              <Parameter Name="NotInV4" Type="Edm.String" />
            </FunctionImport>
          </EntityContainer>
        </Schema>
      </DataServices>
    </Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Unexpected element: Parameter"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Parameter Name="NotInV4" Type="Edm.String" />',
        line: 6,
        column: 60,
      });
    }
  });

  it("unexpected attribute: Edmx/@version", function () {
    const xml = `<Edmx version="4.0"></Edmx>`;
    try {
      csdl.xml2json(xml, { validate: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Edmx, missing attribute: Version"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Edmx version="4.0">',
        line: 1,
        column: 20,
      });
    }
  });

  it("missing attribute: Reference/@Uri", function () {
    const xml = `<Edmx Version="4.0"><Reference uri="foo"/></Edmx>`;
    try {
      csdl.xml2json(xml, { validate: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Reference, missing attribute: Uri"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Reference uri="foo"/>',
        line: 1,
        column: 42,
      });
    }
  });

  it("missing attribute: Include/@Namespace", function () {
    const xml = `<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
      <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.xml">
        <edmx:Include namespace="Org.OData.Core.V1" />
      </edmx:Reference>
    </edmx:Edmx>`;
    try {
      csdl.xml2json(xml, { validate: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Include, missing attribute: Namespace"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<edmx:Include namespace="Org.OData.Core.V1" />',
        line: 3,
        column: 54,
      });
    }
  });

  it("unexpected attribute: Null/@version", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx"><Reference Uri="foo">
      <Annotation Term="choc.bar" xmlns="http://docs.oasis-open.org/odata/ns/edm"><Null version="1" /></Annotation>
    </Reference></Edmx>`;
    try {
      csdl.xml2json(xml, { validate: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Null, unexpected attribute: version"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Null version="1" />',
        line: 2,
        column: 102,
      });
    }
  });

  it("unexpected attribute: Include/@alias", function () {
    const xml = `<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
      <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.xml">
        <edmx:Include Namespace="Org.OData.Core.V1" alias="C" />
      </edmx:Reference>
    </edmx:Edmx>`;
    try {
      csdl.xml2json(xml, { validate: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Include, unexpected attribute: alias"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<edmx:Include Namespace="Org.OData.Core.V1" alias="C" />',
        line: 3,
        column: 64,
      });
    }
  });

  it("missing attribute: Schema/@Namespace", function () {
    const xml = `<Edmx Version="4.0"><DataServices><Schema namespace="foo"/></DataServices></Edmx>`;
    try {
      csdl.xml2json(xml, { validate: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Schema, missing attribute: Namespace"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Schema namespace="foo"/>',
        line: 1,
        column: 59,
      });
    }
  });

  it("missing XML namespace declaration on V4 Edmx", function () {
    const xml = `<Edmx Version="4.0">
                   <DataServices>
                     <Schema Namespace="foo"/>
                   </DataServices>
                 </Edmx>`;
    try {
      csdl.xml2json(xml, { validate: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Edmx: invalid or missing XML namespace "
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Edmx Version="4.0">',
        line: 1,
        column: 20,
      });
    }
  });

  it("missing XML namespace declaration on V4 Schema", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
                   <DataServices>
                     <Schema Namespace="foo">
                       <EntityType />
                     </Schema>
                   </DataServices>
                 </Edmx>`;
    try {
      console.dir(csdl.xml2json(xml, { validate: true }));
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Schema: invalid or missing XML namespace http://docs.oasis-open.org/odata/ns/edmx"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Schema Namespace="foo">',
        line: 3,
        column: 45,
      });
    }
  });

  it("missing XML namespace declaration on old Edmx - ignore everything", function () {
    const xml = `<Edmx Version="1.0">
                   <DataServices m:DataServiceVersion="0-sense" xmlns:m="wrong">
                     <Schema Namespace="n" />
                   </DataServices>
                 </Edmx>`;
    assert.deepStrictEqual(csdl.xml2json(xml), { $Version: "0-sense" });
  });

  it("wrong XML namespace declaration on old Schema", function () {
    const xml = `<Edmx Version="1.0" xmlns="http://schemas.microsoft.com/ado/2007/06/edmx">
                   <DataServices m:DataServiceVersion="" xmlns:m="wrong">
                     <Schema Namespace="foo" xmlns="typo"/>
                   </DataServices>
                 </Edmx>`;
    try {
      console.dir(csdl.xml2json(xml, { validate: true }));
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element DataServices, child element Schema: 0 occurrences instead of at least 1"
      );
      assert.deepStrictEqual(e.parser, {
        construct: "</DataServices>",
        line: 4,
        column: 34,
      });
    }
  });
});
