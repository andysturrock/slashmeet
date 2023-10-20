#!/bin/bash

set -eo pipefail

echo "Deleting old build..."
rm -rf ../lambda-src/dist

mkdir -p ../lambda-src/dist/

echo "Transpiling Typescript..."
# () means execute in subshell, so this one doesn't change directory
( cd ../lambda-src && tsc --project ./tsconfig-build.json )

echo "Adding Ohm generated JS files to dist..."
cp ../lambda-src/ts-src/meetArgs.ohm-bundle.js ../lambda-src/dist

echo "Downloading dependencies..."
cat <<EOF > ../lambda-src/dist/package.json
{
  "type": "module",
  "dependencies": {
    "@slack/bolt": "^3.13.0",
    "googleapis": "^118.0.0",
    "util": "^0.12.5",
    "ohm-js": "^17.1.0"
  }
}
EOF

( cd ../lambda-src/dist && npm install )

echo "Building lambda.zip..."
rm -f ../lambda-src/dist/lambda.zip
node ./build.js
