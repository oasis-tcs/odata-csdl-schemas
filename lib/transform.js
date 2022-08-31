#!/usr/bin/env node
"use strict";

const csdl = require("./xml2json");
const fs = require("fs");
const colors = require("colors/safe");

const exampleFolder = "./examples/";

fs.readdirSync(exampleFolder)
  .filter((fn) => fn.endsWith(".xml"))
  .forEach((xmlFile) => {
    const example = xmlFile.substring(0, xmlFile.lastIndexOf("."));
    console.log(xmlFile);

    try {
      const xml = fs.readFileSync(exampleFolder + xmlFile, "utf8");
      const json = csdl.xml2json(xml, { strict: true });

      fs.writeFileSync(
        exampleFolder + example + ".json",
        JSON.stringify(json, null, 4)
      );
    } catch (e) {
      console.error(
        colors.red(
          `${exampleFolder + xmlFile}:${e.parser.line}:${e.parser.column}: ${
            e.message
          }`
        )
      );
      process.exitCode = 1;
      return;
    }
  });
