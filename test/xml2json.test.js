//TODO:
// V2 service with alias, mix of namespace- and alias-qualified associations/sets
// V2 service with HttpMethod=POST
// UrlRef with nested annotation

const assert = require("assert");
const fs = require("fs");
const { CSDL } = require("../lib/metamodel");

const csdl = require("../lib/xml2json");

const example1 = fs.readFileSync("examples/csdl-16.1.xml");
const result1 = require("../examples/csdl-16.1.json");

const example2 = fs.readFileSync("examples/csdl-16.2.xml");
const result2 = require("../examples/csdl-16.2.json");

const example3 = fs.readFileSync("examples/miscellaneous.xml");
const result3 = require("../examples/miscellaneous.json");

const example4 = fs.readFileSync("examples/miscellaneous2.xml");
const result4 = require("../examples/miscellaneous2.json");

const example5 = fs.readFileSync("test/v2-annotations.xml");
const result5 = require("./v2-annotations.json");

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

  it("v2-annotations", function () {
    assert.deepStrictEqual(csdl.xml2json(example5), result5, "CSDL JSON");
  });

  it("odata-rw-v2", function () {
    assert.deepStrictEqual(csdl.xml2json(example6), result6, "CSDL JSON");
  });

  it("odata-rw-v3", function () {
    assert.deepStrictEqual(csdl.xml2json(example7), result7, "CSDL JSON");
  });

  it("ReferentialConstraint-v2", function () {
    assert.deepStrictEqual(
      csdl.xml2json(example8, { annotations: true }),
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
      '<Record Type="a.b">',
      "</Record><Record />",
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
          "@odata.type": "#a.b",
          "@parser.line": 20,
        },
        { "@parser.line": 21 },
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
    const json = csdl.xml2json(xml, { lineNumbers: true });
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
                          <String>{"type":"object","additionalProperties":false,"patternProperties":{"^[0-9]{3}$":{"type":"string","examples":["foo&amp;bar"]}}}</String>
                        </Annotation>
                        <Annotation Term="Some.PrimitiveTerm">
                          <Annotation Term="C.MediaType" String="application/json" />
                          <String>{"a-b":"not a property name"}</String>
                        </Annotation>
                        <Annotation Term="Some.PrimitiveTerm" Qualifier="usingCDATA">
                          <Annotation Term="C.MediaType" String="application/json" />
                          <String><![CDATA[
                            {
                              "c-data": "goes here"
                            }
                          ]]></String>
                        </Annotation>
                        <Annotation Term="Some.PrimitiveTerm" Qualifier="notJSON">
                          <Annotation Term="C.MediaType" String="application/json" />
                          <String>not JSON</String>
                        </Annotation>
                        <Annotation Term="Some.StructuredTerm">
                          <Record>
                            <PropertyValue Property="someStream">
                              <Annotation Term="C.MediaType" String="application/json" />
                              <String>{"a-b":"not a property name"}</String>
                            </PropertyValue>
                            <PropertyValue Property="someCDATA">
                              <Annotation Term="C.MediaType" String="application/json" />
                              <String><![CDATA[
                                {
                                  "c-data": "goes here"
                                }
                              ]]></String>
                            </PropertyValue>
                            <PropertyValue Property="notJSON">
                              <Annotation Term="C.MediaType" String="application/json" />
                              <String>not JSON</String>
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
          "@J.Schema": {
            type: "object",
            additionalProperties: false,
            patternProperties: {
              "^[0-9]{3}$": {
                type: "string",
                examples: ["foo&bar"],
              },
            },
          },
          "@Some.PrimitiveTerm@C.MediaType": "application/json",
          "@Some.PrimitiveTerm": {
            "a-b": "not a property name",
          },
          "@Some.PrimitiveTerm#notJSON@C.MediaType": "application/json",
          "@Some.PrimitiveTerm#notJSON": "not JSON",
          "@Some.PrimitiveTerm#usingCDATA@C.MediaType": "application/json",
          "@Some.PrimitiveTerm#usingCDATA": {
            "c-data": "goes here",
          },
          "@Some.StructuredTerm": {
            "someStream@C.MediaType": "application/json",
            someStream: {
              "a-b": "not a property name",
            },
            "someCDATA@C.MediaType": "application/json",
            someCDATA: {
              "c-data": "goes here",
            },
            "notJSON@C.MediaType": "application/json",
            notJSON: "not JSON",
          },
        },
      },
    };
    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json.n, schema, "schema");
    assert.deepStrictEqual(messages, [
      {
        message: "Element Annotation, invalid JSON",
        parser: { line: 29, column: 37, construct: "</Annotation>" },
      },
      {
        message: "Element PropertyValue, invalid JSON",
        parser: { line: 47, column: 44, construct: "</PropertyValue>" },
      },
    ]);
  });
});

describe("Edge cases", function () {
  it("MS Graph: ignore spaces in annotation targets", function () {
    const xml = `
    <Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices>
        <Schema Namespace="microsoft.graph" xmlns="http://docs.oasis-open.org/odata/ns/edm">
          <Annotations Target="microsoft.graph.uploadDepToken(microsoft.graph.depOnboardingSetting, Edm.String, Edm.String)">
            <Annotation Term="Org.OData.Core.V1.Description" String="Uploads a new Device Enrollment Program token" />
          </Annotations>
        </Schema>
      </DataServices>
    </Edmx>`;
    const schema = {
      $Annotations: {
        "microsoft.graph.uploadDepToken(microsoft.graph.depOnboardingSetting,Edm.String,Edm.String)":
          {
            "@Org.OData.Core.V1.Description":
              "Uploads a new Device Enrollment Program token",
          },
      },
    };
    const json = csdl.xml2json(xml);
    assert.deepStrictEqual(json["microsoft.graph"], schema, "schema");
  });

  it("annotation on overload with collection-valued parameter", function () {
    const xml = `
    <Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices>
        <Schema Namespace="edge" xmlns="http://docs.oasis-open.org/odata/ns/edm" Alias="this">
          <Annotations Target="One.OddWaldos(Collection(One.Waldo), One.Waldo)">
            <Annotation Term="Org.OData.Core.V1.Description" String="Uploads a waldo" />
          </Annotations>
          <Annotations Target="edge.Func(Collection(edge.Type),edge.Type)">
            <Annotation Term="Org.OData.Core.V1.Description" String="Collection types are also namespace-normalized" />
          </Annotations>
        </Schema>
      </DataServices>
    </Edmx>`;
    const schema = {
      $Alias: "this",
      $Annotations: {
        "One.OddWaldos(Collection(One.Waldo),One.Waldo)": {
          "@Org.OData.Core.V1.Description": "Uploads a waldo",
        },
        "this.Func(Collection(this.Type),this.Type)": {
          "@Org.OData.Core.V1.Description":
            "Collection types are also namespace-normalized",
        },
      },
    };
    const json = csdl.xml2json(xml);
    assert.deepStrictEqual(json.edge, schema, "schema");
  });

  it("Actions and types with same name", function () {
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
                      <Action Name="foo">
                        <Annotation Term="Core.Description" String="this one is ignored" />
                        <Parameter Name="it" Type="collision.bar" />
                      </Action>
                      <Action Name="bar">
                        <Annotation Term="Core.Description" String="this one is ignored" />
                      </Action>
                      <EnumType Name="bar"><Member Name="barBar"/></EnumType>
                      <TypeDefinition Name="bar" UnderlyingType="Edm.String" />
                      <ComplexType Name="bar">
                        <Annotation Term="Core.Description" String="last type wins" />
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
        "@Core.Description": "last type wins",
      },
    };
    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json.collision, schema, "schema");
    assert.deepStrictEqual(messages, [
      {
        message: "Action name collides with other schema child",
        parser: {
          line: 10,
          column: 56,
          construct: '<Action Name="foo" IsBound="true">',
        },
      },
      {
        message: "Action name collides with other schema child",
        parser: {
          line: 14,
          column: 41,
          construct: '<Action Name="foo">',
        },
      },
      {
        message: "Type name collides with other schema child",
        parser: {
          line: 21,
          column: 43,
          construct: '<EnumType Name="bar">',
        },
      },
      {
        message: "Type name collides with other schema child",
        parser: {
          line: 22,
          column: 79,
          construct:
            '<TypeDefinition Name="bar" UnderlyingType="Edm.String" />',
        },
      },
      {
        message: "Type name collides with other schema child",
        parser: {
          line: 23,
          column: 46,
          construct: '<ComplexType Name="bar">',
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Action name collides with other schema child"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Action Name="foo" IsBound="true">',
        line: 10,
        column: 56,
      });
    }
  });

  it("Functions and types with same", function () {
    const xml = `<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
                  <edmx:Reference Uri="https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.xml">
                    <edmx:Include Namespace="Org.OData.Core.V1" Alias="C" />
                  </edmx:Reference>
                  <edmx:DataServices>
                    <Schema Namespace="collision" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                      <EntityType Name="foo">
                        <Annotation Term="Core.Description" String="types win" />
                      </EntityType>
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
                      <Term Name="bar" Type="Edm.String" />
                      <EntityType Name="bar">
                        <Annotation Term="Core.Description" String="types win" />
                      </EntityType>
                    </Schema>
                  </edmx:DataServices>
                 </edmx:Edmx>`;
    const schema = {
      foo: {
        $Kind: "EntityType",
        "@Core.Description": "types win",
      },
      bar: {
        $Kind: "EntityType",
        "@Core.Description": "types win",
      },
    };
    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json.collision, schema, "schema");
    assert.deepStrictEqual(messages, [
      {
        message: "Function name collides with other schema child",
        parser: {
          line: 10,
          column: 58,
          construct: '<Function Name="foo" IsBound="true">',
        },
      },
      {
        message: "Function name collides with other schema child",
        parser: {
          line: 15,
          column: 58,
          construct: '<Function Name="foo" IsBound="true">',
        },
      },
      {
        message: "Term name collides with other schema child",
        parser: {
          line: 25,
          column: 59,
          construct: '<Term Name="bar" Type="Edm.String" />',
        },
      },
      {
        message: "Type name collides with other schema child",
        parser: {
          line: 26,
          column: 45,
          construct: '<EntityType Name="bar">',
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Function name collides with other schema child"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Function Name="foo" IsBound="true">',
        line: 10,
        column: 58,
      });
    }
  });
});

describe("Error cases", function () {
  it("malformed xml", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(e.message.split("\n")[0], "Unclosed root tag");
      assert.deepStrictEqual(e.parser, {
        construct:
          '<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">',
        line: 1,
        column: 69,
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

  it("unexpected root element", function () {
    const xml = `<kaputt/>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Unexpected root element: kaputt"
      );
      assert.deepStrictEqual(e.parser, {
        construct: "<kaputt/>",
        column: 9,
        line: 1,
      });
    }
  });

  it("only Edmx root element", function () {
    try {
      const xml = `<Edmx/>`;
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Edmx, missing attribute: Version"
      );
      assert.deepStrictEqual(e.parser, {
        construct: "<Edmx/>",
        column: 7,
        line: 1,
      });
    }

    {
      let messages = [];
      let xml = `<Edmx Version="4.0"/>`;
      const json = csdl.xml2json(xml, { messages });
      assert.deepStrictEqual(json, {
        $Version: "4.0",
      });
      assert.deepStrictEqual(messages, [
        {
          message: "Element Edmx: invalid or missing XML namespace: ",
          parser: { construct: '<Edmx Version="4.0"/>', column: 21, line: 1 },
        },
        {
          message:
            "Element Edmx, child element DataServices: 0 occurrences instead of at least 1",
          parser: { construct: '<Edmx Version="4.0"/>', column: 21, line: 1 },
        },
      ]);
    }

    {
      const messages = [];
      const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx"/>`;
      const json = csdl.xml2json(xml, { messages });
      assert.deepStrictEqual(json, {
        $Version: "4.0",
      });
      assert.deepStrictEqual(messages, [
        {
          message:
            "Element Edmx, child element DataServices: 0 occurrences instead of at least 1",
          parser: {
            construct:
              '<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx"/>',
            column: 70,
            line: 1,
          },
        },
      ]);
    }
  });

  it("unexpected elements", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices>
        <Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">
          <foo/>
          <String>misplaced constant expression</String>
          <PropertyValue Property="foo"/>
        </Schema>
        <EntityType Name="misplaced" xmlns="http://docs.oasis-open.org/odata/ns/edm">
        </EntityType>
      </DataServices>
    </Edmx>`;

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
      n: {},
    });
    assert.deepStrictEqual(messages, [
      {
        message: "Element Schema, unexpected child: foo",
        parser: { construct: "<foo/>", column: 16, line: 4 },
      },
      {
        message: "Element Schema, unexpected child: String",
        parser: { construct: "<String>", column: 18, line: 5 },
      },
      {
        message: "Element Schema, unexpected child: PropertyValue",
        parser: {
          construct: '<PropertyValue Property="foo"/>',
          column: 41,
          line: 6,
        },
      },
      {
        message: "Element DataServices, unexpected child: EntityType",
        parser: {
          construct:
            '<EntityType Name="misplaced" xmlns="http://docs.oasis-open.org/odata/ns/edm">',
          column: 85,
          line: 8,
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
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
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">X<DataServices>
    <Schema Namespace="foo" xmlns="http://docs.oasis-open.org/odata/ns/edm">Y</Schema>Z</DataServices><![CDATA[A]]></Edmx>`;
    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
      foo: {},
    });
    assert.deepStrictEqual(messages, [
      {
        message: "Element DataServices, unexpected text: X",
        parser: { line: 1, column: 84, construct: "<DataServices>" },
      },
      {
        message: "Element Schema, unexpected text: Y",
        parser: { line: 2, column: 86, construct: "</Schema>" },
      },
      {
        message: "Element DataServices, unexpected text: Z",
        parser: { line: 2, column: 102, construct: "</DataServices>" },
      },
      {
        message: "Element DataServices, unexpected CDATA: A",
        parser: { line: 2, column: 115, construct: "<![CDATA[A]]>" },
      },
    ]);

    try {
      const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">X<DataServices>
        <Schema Namespace="foo" xmlns="http://docs.oasis-open.org/odata/ns/edm"/></DataServices></Edmx>`;
      csdl.xml2json(xml, { strict: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element DataServices, unexpected text: X"
      );
      assert.deepStrictEqual(e.parser, {
        construct: "<DataServices>",
        line: 1,
        column: 84,
      });
    }
    try {
      const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx"><DataServices>
        <Schema Namespace="foo" xmlns="http://docs.oasis-open.org/odata/ns/edm"/></DataServices>Y</Edmx>`;
      csdl.xml2json(xml, { strict: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Edmx, unexpected text: Y"
      );
      assert.deepStrictEqual(e.parser, {
        construct: "</Edmx>",
        line: 2,
        column: 104,
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

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
      n: { "@Unknown.Element": true },
    });
    assert.deepStrictEqual(messages, [
      {
        message: "Element Annotation, unexpected child: string",
        parser: { construct: "<string/>", line: 4, column: 87 },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
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

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.01",
      n: { Annotation: { $Kind: "Term", $Collection: true } },
    });
    assert.deepStrictEqual(messages, [
      {
        message: "Element Term, Type=Collection without Nullable attribute",
        parser: {
          construct: '<Term Name="Annotation" Type="Collection(Edm.String)"/>',
          line: 4,
          column: 65,
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
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

  it("Collection-valued navigation property with Nullable", function () {
    const xml = `<Edmx Version="4.01" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices>
        <Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">
          <EntityType Name="Foo">
            <NavigationProperty Name="bars" Type="Collection(n.Bar)" Nullable="true" />
          </EntityType>
        </Schema>
      </DataServices>
    </Edmx>`;

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.01",
      n: {
        Foo: {
          $Kind: "EntityType",
          bars: {
            $Kind: "NavigationProperty",
            $Collection: true,
            $Type: "n.Bar",
          },
        },
      },
    });
    assert.deepStrictEqual(messages, [
      {
        message:
          "Element NavigationProperty, Type=Collection(...) with Nullable attribute",
        parser: {
          construct:
            '<NavigationProperty Name="bars" Type="Collection(n.Bar)" Nullable="true" />',
          column: 87,
          line: 5,
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element NavigationProperty, Type=Collection(...) with Nullable attribute"
      );
      assert.deepStrictEqual(e.parser, {
        construct:
          '<NavigationProperty Name="bars" Type="Collection(n.Bar)" Nullable="true" />',
        column: 87,
        line: 5,
      });
    }
  });

  it("forbidden Nullable in ReturnType", function () {
    const xml = `<Edmx Version="4.01" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices>
        <Schema Namespace="n" xmlns="http://docs.oasis-open.org/odata/ns/edm">
          <Function Name="f">
            <ReturnType Type="Collection(Edm.EntityType)" Nullable="false"/>
          </Function>
        </Schema>
      </DataServices>
    </Edmx>`;

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.01",
      n: {
        f: [
          {
            $Kind: "Function",
            $ReturnType: { $Collection: true, $Type: "Edm.EntityType" },
          },
        ],
      },
    });
    assert.deepStrictEqual(messages, [
      {
        message:
          "Element ReturnType, Type=Collection(Edm.EntityType) with Nullable attribute",
        parser: {
          construct:
            '<ReturnType Type="Collection(Edm.EntityType)" Nullable="false"/>',
          line: 5,
          column: 76,
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element ReturnType, Type=Collection(Edm.EntityType) with Nullable attribute"
      );
      assert.deepStrictEqual(e.parser, {
        construct:
          '<ReturnType Type="Collection(Edm.EntityType)" Nullable="false"/>',
        line: 5,
        column: 76,
      });
    }
  });

  it("misplaced element", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <Schema Namespace="n">
      </Schema>
    </Edmx>`;

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
    });
    assert.deepStrictEqual(messages, [
      {
        message: "Element Edmx, unexpected child: Schema",
        parser: { construct: '<Schema Namespace="n">', line: 2, column: 28 },
      },
      {
        message:
          "Element Edmx, child element DataServices: 0 occurrences instead of at least 1",
        parser: { construct: "</Edmx>", line: 4, column: 11 },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
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
      <Annotation Term="Core.Description"/>
    </Edmx>`;

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
    });
    assert.deepStrictEqual(messages, [
      {
        message: "Element Edmx, unexpected child: Annotation",
        parser: {
          construct: '<Annotation Term="Core.Description"/>',
          line: 2,
          column: 43,
        },
      },
      {
        message:
          "Element Edmx, child element DataServices: 0 occurrences instead of at least 1",
        parser: { construct: "</Edmx>", line: 3, column: 11 },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Edmx, unexpected child: Annotation"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Annotation Term="Core.Description"/>',
        line: 2,
        column: 43,
      });
    }
  });

  it("element occurs too often", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices><Schema Namespace="foo" xmlns="http://docs.oasis-open.org/odata/ns/edm"/></DataServices>
      <DataServices/>
    </Edmx>`;

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
      foo: {},
    });
    assert.deepStrictEqual(messages, [
      {
        message: "Element DataServices: 2 occurrences instead of at most 1",
        parser: {
          construct: "<DataServices/>",
          line: 3,
          column: 21,
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
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

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
      foo: { "@foo.bar": { $Eq: ["foo"] } },
    });
    assert.deepStrictEqual(messages, [
      {
        message:
          "Element Eq, child element expression: 1 occurrences instead of at least 2",
        parser: {
          construct: "</Eq>",
          line: 7,
          column: 17,
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
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
              <String>bar</String>
            </Eq>
          </Annotation>
        </Schema>
      </DataServices>
    </Edmx>`;

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
      foo: { "@foo.bar": { $Eq: ["foo", true] } },
    });
    assert.deepStrictEqual(messages, [
      {
        message: "Element expression: 3 occurrences instead of at most 2",
        parser: {
          construct: "<String>",
          line: 8,
          column: 22,
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
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
      csdl.xml2json(xml, { strict: true });
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
          <Association Name="NotInV4">
            <End Role="foo" Type="bar" Multiplicity="*"/>
            <End Role="foo" Type="bar" Multiplicity="x"/>
          </Association>
        </Schema>
      </DataServices>
    </Edmx>`;

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
      n: {},
    });
    assert.deepStrictEqual(messages, [
      {
        message: "Unexpected element: Association",
        parser: {
          construct: '<Association Name="NotInV4">',
          line: 4,
          column: 38,
        },
      },
      {
        message: "Unexpected element: End",
        parser: {
          construct: '<End Role="foo" Type="bar" Multiplicity="*"/>',
          line: 5,
          column: 57,
        },
      },
      {
        message: "Unexpected element: End",
        parser: {
          construct: '<End Role="foo" Type="bar" Multiplicity="x"/>',
          line: 6,
          column: 57,
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Unexpected element: Association"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Association Name="NotInV4">',
        line: 4,
        column: 38,
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

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
      $EntityContainer: "n.container",
      n: {
        container: { $Kind: "EntityContainer", fi: { $Function: "f" } },
      },
    });
    assert.deepStrictEqual(messages, [
      {
        message: "Unexpected element: Parameter",
        parser: {
          construct: '<Parameter Name="NotInV4" Type="Edm.String" />',
          line: 6,
          column: 60,
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
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
      csdl.xml2json(xml);
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
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <Reference uri="foo"/>
    </Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Reference, missing attribute: Uri"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Reference uri="foo"/>',
        line: 2,
        column: 28,
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
      csdl.xml2json(xml);
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
    </Reference>
    <DataServices><Schema Namespace="foo" xmlns="http://docs.oasis-open.org/odata/ns/edm"/></DataServices></Edmx>`;

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
      $Reference: { foo: { "@choc.bar": null } },
      foo: {},
    });
    assert.deepStrictEqual(messages, [
      {
        message: "Element Null, unexpected attribute: version",
        parser: {
          construct: '<Null version="1" />',
          line: 2,
          column: 102,
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
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
      <edmx:DataServices><Schema Namespace="foo" xmlns="http://docs.oasis-open.org/odata/ns/edm"/></edmx:DataServices>
    </edmx:Edmx>`;

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
      $Reference: {
        "https://oasis-tcs.github.io/odata-vocabularies/vocabularies/Org.OData.Core.V1.json":
          { $Include: [{ $Namespace: "Org.OData.Core.V1" }] },
      },
      foo: {},
    });
    assert.deepStrictEqual(messages, [
      {
        message: "Element Include, unexpected attribute: alias",
        parser: {
          construct: '<edmx:Include Namespace="Org.OData.Core.V1" alias="C" />',
          line: 3,
          column: 64,
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
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
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
      <DataServices><Schema namespace="foo"/></DataServices></Edmx>`;
    try {
      csdl.xml2json(xml);
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Schema, missing attribute: Namespace"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Schema namespace="foo"/>',
        line: 2,
        column: 45,
      });
    }
  });

  it("missing XML namespace declaration on V4 Edmx", function () {
    const xml = `<Edmx Version="4.0">
                   <DataServices>
                     <Schema Namespace="foo"/>
                   </DataServices>
                 </Edmx>`;

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
      foo: {},
    });
    assert.deepStrictEqual(messages, [
      {
        message: "Element Edmx: invalid or missing XML namespace: ",
        parser: {
          construct: '<Edmx Version="4.0">',
          line: 1,
          column: 20,
        },
      },
      {
        message: "Element DataServices: invalid or missing XML namespace: ",
        parser: {
          construct: "<DataServices>",
          line: 2,
          column: 33,
        },
      },
      {
        message: "Element Schema: invalid or missing XML namespace: ",
        parser: {
          construct: '<Schema Namespace="foo"/>',
          line: 3,
          column: 46,
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Edmx: invalid or missing XML namespace: "
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
                       <EntityType Name="bar"/>
                     </Schema>
                   </DataServices>
                 </Edmx>`;

    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    assert.deepStrictEqual(json, {
      $Version: "4.0",
      foo: { bar: { $Kind: "EntityType" } },
    });
    assert.deepStrictEqual(messages, [
      {
        message:
          "Element Schema: invalid or missing XML namespace: http://docs.oasis-open.org/odata/ns/edmx",
        parser: {
          construct: '<Schema Namespace="foo">',
          line: 3,
          column: 45,
        },
      },
      {
        message:
          "Element EntityType: invalid or missing XML namespace: http://docs.oasis-open.org/odata/ns/edmx",
        parser: {
          construct: '<EntityType Name="bar"/>',
          line: 4,
          column: 47,
        },
      },
    ]);

    try {
      csdl.xml2json(xml, { strict: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Schema: invalid or missing XML namespace: http://docs.oasis-open.org/odata/ns/edmx"
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Schema Namespace="foo">',
        line: 3,
        column: 45,
      });
    }
  });

  it("missing XML namespace declaration on Edmx", function () {
    const xml = `<Edmx Version="1.0">
                   <DataServices m:DataServiceVersion="0-sense" xmlns:m="wrong">
                     <Schema Namespace="n" />
                   </DataServices>
                 </Edmx>`;
    try {
      csdl.xml2json(xml, { strict: true });
      assert.fail("should not get here");
    } catch (e) {
      assert.strictEqual(
        e.message.split("\n")[0],
        "Element Edmx: invalid or missing XML namespace: "
      );
      assert.deepStrictEqual(e.parser, {
        construct: '<Edmx Version="1.0">',
        line: 1,
        column: 20,
      });
    }
  });

  it("wrong XML namespace declaration on old Schema", function () {
    const xml = `<Edmx Version="1.0" xmlns="http://schemas.microsoft.com/ado/2007/06/edmx">
                   <DataServices m:DataServiceVersion="" xmlns:m="wrong">
                     <Schema Namespace="foo" xmlns="typo"/>
                   </DataServices>
                 </Edmx>`;
    try {
      csdl.xml2json(xml, { strict: true });
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

  it("Name collisions: namespaces, types, (navigation) properties, enum members - last one wins", function () {
    const xml = `<Edmx Version="4.0" xmlns="http://docs.oasis-open.org/odata/ns/edmx">
                   <DataServices>
                     <Schema Namespace="foo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                       <EntityType Name="ignore"/>
                     </Schema>
                     <Schema Namespace="foo" xmlns="http://docs.oasis-open.org/odata/ns/edm">
                       <ComplexType Name="bar"/>
                       <ComplexType Name="bar"/>
                       <EntityContainer Name="bar"/>
                       <EntityType Name="bar">
                         <Property Name="baz" Type="Edm.String"/>
                         <Property Name="baz" Type="Edm.String"/>
                         <NavigationProperty Name="baz" Type="foo.bar"/>
                       </EntityType>
                       <EnumType Name="qux">
                         <Member Name="quux"/>
                         <Member Name="quux" Value="42"/>
                         <EnumMember Name="quux"/>
                       </EnumType>
                       <EntityContainer Name="container">
                         <EntitySet Name="bar" EntityType="foo.qux"/>
                         <EntitySet Name="bar" EntityType="foo.bar"/>
                         <Singleton Name="bar" Type="foo.bar"/>
                         <ActionImport Name="bar" Action="foo.bar"/>
                         <FunctionImport Name="bar" Function="foo.bar"/>
                       </EntityContainer>
                     </Schema>
                   </DataServices>
                 </Edmx>`;

    const messages = [];
    const json = csdl.xml2json(xml, { messages });

    assert.deepStrictEqual(messages, [
      {
        message: "Element EnumType, unexpected child: EnumMember",
        parser: {
          construct: '<EnumMember Name="quux"/>',
          line: 18,
          column: 50,
        },
      },
      {
        message: "Schema namespace collides with other schema",
        parser: {
          construct:
            '<Schema Namespace="foo" xmlns="http://docs.oasis-open.org/odata/ns/edm">',
          line: 6,
          column: 93,
        },
      },
      {
        message: "Type name collides with other schema child",
        parser: {
          construct: '<ComplexType Name="bar"/>',
          line: 8,
          column: 48,
        },
      },
      {
        message: "Entity container name collides with other schema child",
        parser: {
          construct: '<EntityContainer Name="bar"/>',
          line: 9,
          column: 52,
        },
      },
      {
        message: "Type name collides with other schema child",
        parser: {
          construct: '<EntityType Name="bar">',
          line: 10,
          column: 46,
        },
      },
      {
        message: "Property name collides with other property",
        parser: {
          construct: '<Property Name="baz" Type="Edm.String"/>',
          line: 12,
          column: 65,
        },
      },
      {
        message: "Navigation property name collides with other property",
        parser: {
          construct: '<NavigationProperty Name="baz" Type="foo.bar"/>',
          line: 13,
          column: 72,
        },
      },
      {
        message: "Enumeration member name collides with other member",
        parser: {
          construct: '<Member Name="quux" Value="42"/>',
          line: 17,
          column: 57,
        },
      },

      {
        message: "Entity set name collides with other container child",
        parser: {
          construct: '<EntitySet Name="bar" EntityType="foo.bar"/>',
          line: 22,
          column: 69,
        },
      },
      {
        message: "Singleton name collides with other container child",
        parser: {
          construct: '<Singleton Name="bar" Type="foo.bar"/>',
          line: 23,
          column: 63,
        },
      },
      {
        message: "Action import name collides with other container child",
        parser: {
          construct: '<ActionImport Name="bar" Action="foo.bar"/>',
          line: 24,
          column: 68,
        },
      },
      {
        message: "Function import name collides with other container child",
        parser: {
          construct: '<FunctionImport Name="bar" Function="foo.bar"/>',
          line: 25,
          column: 72,
        },
      },
    ]);

    assert.deepStrictEqual(json, new CSDL({
      $Version: "4.0",
      $EntityContainer: "foo.container",
      foo: {
        bar: {
          $Kind: "EntityType",
          baz: {
            $Kind: "NavigationProperty",
            $Type: "foo.bar",
            $Nullable: true,
          },
        },
        qux: { $Kind: "EnumType", quux: 42 },
        container: {
          $Kind: "EntityContainer",
          bar: { $Function: "foo.bar" },
        },
      },
    }));
  });
});
