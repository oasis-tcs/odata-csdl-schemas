const assert = require("assert");
const Ajv = require("ajv");
const ajv = new Ajv({ allErrors: true, strict: true });

const csdlSchema = require("../schemas/csdl.schema.json");
const validate = ajv.compile(csdlSchema);

const example1 = require("../examples/csdl-16.1.json");
const example2 = require("../examples/csdl-16.2.json");
const example3 = require("../examples/miscellaneous.json");
const example4 = require("../examples/miscellaneous2.json");

describe("Validate examples", function () {
  it("csdl-16.1", function () {
    validate(example1);
    assert.deepStrictEqual(validate.errors, null);
  });

  it("csdl-16.2", function () {
    validate(example2);
    assert.deepStrictEqual(validate.errors, null);
  });

  it("miscellaneous", function () {
    validate(example3);
    assert.deepStrictEqual(validate.errors, null);
  });

  it("miscellaneous2", function () {
    validate(example4);
    assert.deepStrictEqual(validate.errors, null);
  });

  it("valid property names", function () {
    validate({
      $Version: "4.0",
      schema: {
        et: {
          $Kind: "EntityType",
          foo: {},
          foo2bar: {},
          foo_bar: {},
          __id: {},
          schön: {},
        },
      },
    });
    assert.deepStrictEqual(validate.errors, null);
  });
});

describe("Negative validation", function () {
  it("no object", function () {
    validate([]);
    assert.deepStrictEqual(validate.errors[0].message, "must be object");
  });

  it("no $Version", function () {
    validate({});
    assert.deepStrictEqual(
      validate.errors[0].message,
      "must have required property '$Version'"
    );
  });

  it("invalid schema name", function () {
    validate({
      $Version: "4.0",
      "wrong-schema-name": {},
    });
    assert.deepStrictEqual(validate.errors[0], {
      instancePath: "",
      schemaPath: "#/additionalProperties",
      keyword: "additionalProperties",
      params: { additionalProperty: "wrong-schema-name" },
      message: "must NOT have additional properties",
    });
  });

  it("invalid schema child name", function () {
    validate({
      $Version: "4.0",
      schema: {
        "wrong-type-name": { $Kind: "EntityType" },
      },
    });
    assert.deepStrictEqual(validate.errors[0], {
      instancePath: "/schema",
      schemaPath: "#/additionalProperties",
      keyword: "additionalProperties",
      params: { additionalProperty: "wrong-type-name" },
      message: "must NOT have additional properties",
    });
  });

  it("invalid property name in entity type", function () {
    validate({
      $Version: "4.0",
      "my.schema": {
        et: { $Kind: "EntityType", 42: {} },
      },
    });
    assert.deepStrictEqual(validate.errors[0], {
      instancePath: "/my.schema/et",
      schemaPath: "#/additionalProperties",
      keyword: "additionalProperties",
      params: { additionalProperty: "42" },
      message: "must NOT have additional properties",
    });
  });

  it("invalid property name in complex type", function () {
    validate({
      $Version: "4.0",
      "my.schema": {
        ct: { $Kind: "ComplexType", "no.dots": {} },
      },
    });
    assert.deepStrictEqual(validate.errors[0], {
      instancePath: "/my.schema/ct",
      schemaPath: "#/additionalProperties",
      keyword: "additionalProperties",
      params: { additionalProperty: "no.dots" },
      message: "must NOT have additional properties",
    });
  });

  it("invalid member name in enumeration type", function () {
    validate({
      $Version: "4.0",
      "my.schema": {
        ent: { $Kind: "EnumType", "no-dashes": {} },
      },
    });
    assert.deepStrictEqual(validate.errors[0], {
      instancePath: "/my.schema/ent",
      schemaPath: "#/additionalProperties",
      keyword: "additionalProperties",
      params: { additionalProperty: "no-dashes" },
      message: "must NOT have additional properties",
    });
  });

  it("invalid action parameter name", function () {
    validate({
      $Version: "4.0",
      "my.schema": {
        a: [{ $Kind: "Action", $Parameter: [{ $Name: "no/slashes" }] }],
      },
    });
    assert.deepStrictEqual(
      validate.errors.find(
        (e) => e.instancePath === "/my.schema/a/0/$Parameter/0/$Name"
      ),
      {
        instancePath: "/my.schema/a/0/$Parameter/0/$Name",
        schemaPath: "#/definitions/SimpleIdentifier/pattern",
        keyword: "pattern",
        params: {
          pattern:
            "^(_|\\p{L}|\\p{Nl})(_|\\p{L}|\\p{Nl}|\\p{Nd}|\\p{Mn}|\\p{Mc}|\\p{Pc}|\\p{Cf}){0,127}$",
        },
        message:
          'must match pattern "^(_|\\p{L}|\\p{Nl})(_|\\p{L}|\\p{Nl}|\\p{Nd}|\\p{Mn}|\\p{Mc}|\\p{Pc}|\\p{Cf}){0,127}$"',
      }
    );
  });

  it("invalid function parameter name", function () {
    validate({
      $Version: "4.0",
      "my.schema": {
        f: [{ $Kind: "Function", $Parameter: [{ $Name: "no/slashes" }] }],
      },
    });
    assert.deepStrictEqual(
      validate.errors.find(
        (e) => e.instancePath === "/my.schema/f/0/$Parameter/0/$Name"
      ),
      {
        instancePath: "/my.schema/f/0/$Parameter/0/$Name",
        schemaPath: "#/definitions/SimpleIdentifier/pattern",
        keyword: "pattern",
        params: {
          pattern:
            "^(_|\\p{L}|\\p{Nl})(_|\\p{L}|\\p{Nl}|\\p{Nd}|\\p{Mn}|\\p{Mc}|\\p{Pc}|\\p{Cf}){0,127}$",
        },
        message:
          'must match pattern "^(_|\\p{L}|\\p{Nl})(_|\\p{L}|\\p{Nl}|\\p{Nd}|\\p{Mn}|\\p{Mc}|\\p{Pc}|\\p{Cf}){0,127}$"',
      }
    );
  });

  it("invalid property type name", function () {
    validate({
      $Version: "4.0",
      "my.schema": {
        et: { $Kind: "EntityType", wrongType: { $Type: "no$good" } },
      },
    });
    assert.deepStrictEqual(validate.errors[0], {
      instancePath: "/my.schema/et/wrongType/$Type",
      schemaPath: "#/definitions/QualifiedName/pattern",
      keyword: "pattern",
      params: {
        pattern:
          "^(_|\\p{L}|\\p{Nl})(_|\\p{L}|\\p{Nl}|\\p{Nd}|\\p{Mn}|\\p{Mc}|\\p{Pc}|\\p{Cf}){0,127}(\\.(_|\\p{L}|\\p{Nl})(_|\\p{L}|\\p{Nl}|\\p{Nd}|\\p{Mn}|\\p{Mc}|\\p{Pc}|\\p{Cf}){0,127})*$",
      },
      message:
        'must match pattern "^(_|\\p{L}|\\p{Nl})(_|\\p{L}|\\p{Nl}|\\p{Nd}|\\p{Mn}|\\p{Mc}|\\p{Pc}|\\p{Cf}){0,127}(\\.(_|\\p{L}|\\p{Nl})(_|\\p{L}|\\p{Nl}|\\p{Nd}|\\p{Mn}|\\p{Mc}|\\p{Pc}|\\p{Cf}){0,127})*$"',
    });
  });
});
