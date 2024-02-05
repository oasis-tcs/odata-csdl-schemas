#!/usr/bin/env node
"use strict";

//TODO: glob for source file patterns
//TODO: continue on validation error

const csdl = require("./xml2json");
var minimist = require("minimist");
var fs = require("fs");
const colors = require("colors/safe");

var unknown = false;

var argv = minimist(process.argv.slice(2), {
  string: ["t", "target"],
  boolean: ["h", "help", "p", "pretty"],
  alias: {
    h: "help",
    p: "pretty",
    t: "target",
  },
  default: {
    pretty: false,
  },
  unknown: (arg) => {
    if (arg.substring(0, 1) == "-") {
      console.error("Unknown option: " + arg);
      unknown = true;
      return false;
    }
  },
});

if (unknown || argv._.length == 0 || argv.h) {
  console.log(`Usage: odata-csdl-xml2json <options> <source files>
Options:
 -h, --help              show this info
 -p, --pretty            pretty-print JSON result
 -t, --target            target file (only useful with a single source file)`);
} else {
  for (var i = 0; i < argv._.length; i++) {
    convert(argv._[i]);
  }
}

function convert(source) {
  if (!fs.existsSync(source)) {
    console.error("Source file not found: " + source);
    return;
  }

  const xml = fs.readFileSync(source);

  try {
    const messages = [];
    const json = csdl.xml2json(xml, { messages });
    for (const m of messages) {
      console.warn(
        `${source}:${m.parser.line}:${m.parser.column}: ${m.message}`
      );
    }

    const target =
      argv.t || source.substring(0, source.lastIndexOf(".")) + ".json";
    console.log(target);
    fs.writeFileSync(target, JSON.stringify(json, null, argv.pretty ? 4 : 0));
  } catch (e) {
    console.error(
      colors.red(
        `${source}:${e.parser.line}:${e.parser.column}: ${e.message}\nAt: ${e.parser.construct}`
      )
    );
    process.exitCode = 1;
    return;
  }
}
