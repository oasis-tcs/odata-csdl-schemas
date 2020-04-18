# Convert OData CSDL XML to CSDL JSON

## Installation

Clone or download this repository, go to its root folder and type
```sh
npm install
```

To install globally type
```sh
npm install -g
```
## Usage

Assuming you installed the script globally and your XML metadata file is `MyMetadata.xml`, then
```sh
odata-csdl-xml2json -p MyMetadata.xml
```
will create `MyMetadata.json` next to it. 


Just type
```sh
odata-csdl-xml2json -h
```
to get usage hints
```
Usage: odata-csdl-xml2json <options> <source files>
Options:
 -h, --help              show this info
 -p, --pretty            pretty-print JSON result
 -t, --target            target file (only useful with a single source file)
```

If you installed the script locally, start it via
```sh
node lib/cli.js ...
```
