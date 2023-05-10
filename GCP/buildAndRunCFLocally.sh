#!/bin/bash

CWD=`dirname $0`
echo $CWD
pushd .

cd $CWD/../function-src
rm -rf dist

echo "Transpiling Typescript..."
tsc

echo "Setting up dist/package.json..."
cp package.json dist
sed -e "s#dist/gcp/slashmeet.js#gcp/slashmeet.js#g" dist/package.json > dist/package.json.tmp
mv dist/package.json.tmp dist/package.json

echo "Loading secrets..."
. ./.secrets

echo "Starting local server..."
CMD="npx functions-framework --target=slashmeet --signature-type=http"
SLACK_SECRET=$SLACK_SECRET CLIENT_ID=$CLIENT_ID CLIENT_SECRET=$CLIENT_SECRET REDIRECT_URI=$REDIRECT_URI $CMD

popd