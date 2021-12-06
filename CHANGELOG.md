# Changelog

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
