'use strict';

// Disable some eslint warnings because it gets confused in a mixed TS/JS project.
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const path = require('path');
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const glob = require('glob-promise');
// eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
const AdmZip = require("adm-zip");

async function main() {
  const zip = new AdmZip();
  const functionDirPath = path.join('..', '..', 'function-src');
  const distDirPath = path.join(functionDirPath, 'dist');
  const zipfilePath = path.join(distDirPath, 'lambda.zip');
  // TODO use proper path stuff for the glob.
  const jsFiles = await glob('../../function-src/dist/*.js');
  jsFiles.forEach(jsFile => {
    console.log(`adding ${jsFile}`);
    zip.addLocalFile(jsFile);
  });
  const awsDir = path.join(distDirPath, 'aws');
  console.log(`adding ${awsDir}`);
  zip.addLocalFolder(awsDir, "aws");
  const node_modules = path.join(distDirPath, 'node_modules');
  console.log(`adding ${node_modules}`);
  zip.addLocalFolder(node_modules, "node_modules");
  zip.writeZip(zipfilePath);
  console.log(`Created ${zipfilePath} successfully`);
}

main();