# Changelog

## 0.9.2 2024-01-24

### Added

- `xml2json`: detect name collisions of schemas, schema children, type children, and entity container children

## 0.9.0 2024-01-24

### Added

- `xml2json`: option `messages` to collect all error messages in non-strict mode

## 0.8.3 2023-08-16

### Fixed

- `xml2json`: OData V2 EntitySet element may contain Documentation element

## 0.8.2 2023-06-15

### Fixed

- `xml2json`: Annotation targets for overloads with collection-typed parameters are now correctly normalized

## 0.8.1 2023-03-06

### Added

- `xml2json`: OData V2: accept `Documentation` element nested in `FunctionImport` and `Parameter` elements

## 0.8.0 2023-02-27

### Added

- `xml2json`: accept more [SAP Annotations for OData Version 2.0](https://github.com/SAP/odata-vocabularies/blob/main/docs/v2-annotations.md)

## 0.7.0 2022-10-20

### Added

- `xml2json`: accept some [SAP Annotations for OData Version 2.0](https://github.com/SAP/odata-vocabularies/blob/main/docs/v2-annotations.md) and turn them into [Capabilities](https://github.com/oasis-tcs/odata-vocabularies/blob/main/vocabularies/Org.OData.Capabilities.V1.md)

## 0.6.0 2022-08-31

### Changed

- `xml2json`: expects an options object as second parameter, replacing the current second and third parameters which have become properties of the options object:
  - `lineNumbers` (Boolean, default `false`): add XML source line numbers to JSON output
  - `annotations` (Boolean, default `false`): include XML annotation attributes in JSON output
  - `strict` (Boolean, default `false`): strict validation of XML source (some validations cannot be turned off)

## 0.5.1 2022-08-30

### Changed

- `xml2json`: strip illegal whitespace from annotation targets in XML source
- `xml2json`: correctly process annotation targets for action/function overloads with collection-valued parameters

## 0.5.0 2022-08-11

- `edm.xsd`: correct patterns for TSimpleIdentifier, TQualifiedName, and TTypeName

## 0.4.4 2022-03-29

### Added

- `xml2json`: detect unexpected text content in source XML
- `xml2json`: improved checks for `ReturnType` element

## 0.4.3 2022-01-10

### Added

- Allow V4 annotations as foreign markup in V2

## 0.4.2 2022-01-07

### Added

- `Property` and `Term` with `Type="Collection(...)"` must specify `Nullable` in 4.01.
- `ReturnType Type="Collection(Edm.EntityType)"` must not specify `Nullable`.

## 0.4.1 2021-12-13

### Added

- Unit tests for `csdl.schema.json`

### Changed

- `csdl.schema.json`: patterns for SimpleIdentifier and QualifiedName

## 0.4.0 2021-12-06

### Added

- `xml2json` now minimally validates the input XML
  - unexpected elements
  - incorrect nesting of elements
  - incorrect occurrence of child elements
  - missing required attributes
  - unexpected local attributes

## 0.3.0 2021-09-24

### Added

- `xml2json` now imports [annotation attributes](https://docs.microsoft.com/en-us/openspecs/windows_protocols/mc-csdl/2110a8d9-9849-48c3-92c3-e15dd2f5cd08) from OData V2 and OData V3 CSDL XML documents if its new third (and optional) parameter is set to `true`, default is `false`
