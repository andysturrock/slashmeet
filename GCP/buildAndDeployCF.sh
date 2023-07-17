#!/bin/bash

CWD=`dirname $0`
echo $CWD
pushd .

cd $CWD/../function-src
rm -rf dist

echo "Transpiling Typescript..."
tsc --project tsconfig-gcp.json

echo "Setting up dist/package.json..."
cp package.json dist
sed -e "s#dist/gcp/slashmeet.js#gcp/slashmeet.js#g" dist/package.json > dist/package.json.tmp
mv dist/package.json.tmp dist/package.json
grep -v aws dist/package.json > dist/package.json.tmp
mv dist/package.json.tmp dist/package.json

echo "Loading secrets..."
. ./.secrets

echo "Deploying to GCP..."
gcloud functions deploy slashMeet-function --gen2 --runtime=nodejs18 --region=europe-west2 --source=./dist --entry-point=slashmeet --trigger-http --set-env-vars "SLACK_SIGNING_SECRET=$SLACK_SIGNING_SECRET,CLIENT_ID=$CLIENT_ID,CLIENT_SECRET=$CLIENT_SECRET,REDIRECT_URI=$REDIRECT_URI" --allow-unauthenticated

popd