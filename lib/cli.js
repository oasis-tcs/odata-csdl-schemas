#!/usr/bin/env node
"use strict";

//TODO: glob for source file patterns
//TODO: continue on validation error

const csdl = require("./xml2json");
const { parseArgs } = require("node:util");
const fs = require("node:fs");
const colors = require("colors/safe");

let unknown = false;
let args;

try {
  args = parseArgs({
    options: {
      help: { type: "boolean", short: "h" },
      pretty: { type: "boolean", short: "p" },
      target: { type: "string", short: "t" },
    },
    allowPositionals: true,
  });
} catch (e) {
  console.error(e.message);
  unknown = true;
}

if (unknown || args.positionals.length == 0 || args.values.help) {
  console.log(`Usage: odata-csdl-xml2json <options> <source files>
Options:
 -h, --help              show this info
 -p, --pretty            pretty-print JSON result
 -t, --target            target file (only useful with a single source file)`);
} else {
  for (var i = 0; i < args.positionals.length; i++) {
    convert(args.positionals[i]);
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
      args.values.target ||
      source.substring(0, source.lastIndexOf(".")) + ".json";
    console.log(target);
    fs.writeFileSync(
      target,
      JSON.stringify(json, null, args.values.pretty ? 4 : 0)
    );
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
