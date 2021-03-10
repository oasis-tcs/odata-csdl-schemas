#!/usr/bin/env node
"use strict";

const csdl = require("./xml2json");
const fs = require("fs");

const exampleFolder = "./examples/";

fs.readdirSync(exampleFolder)
  .filter((fn) => fn.endsWith(".xml"))
  .forEach((xmlfile) => {
    const example = xmlfile.substring(0, xmlfile.lastIndexOf("."));
    console.log(xmlfile);

    const xml = fs.readFileSync(exampleFolder + xmlfile, "utf8");
    const json = csdl.xml2json(xml, false);

    fs.writeFileSync(
      exampleFolder + example + ".json",
      JSON.stringify(json, null, 4)
    );
  });
