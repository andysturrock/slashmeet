#!/bin/bash

set -eo pipefail

echo "Deleting old bundles..."
rm -rf ../lambda-src/dist

# For the commands below () means execute in subshell, so this script doesn't change directory itself

lambdas="handleSlashCommand handleMeetCommand handleSlackAuthRedirect handleGoogleAuthRedirect"
for lambda in ${lambdas}
do
  echo "Bundling ${lambda}..."
  ( cd ../lambda-src && \
    esbuild ./ts-src/${lambda}.ts \
    --bundle \
    --external:aws-sdk \
    --sourcemap \
    --tsconfig=./tsconfig-build.json \
    --platform=node \
    --target=node18 \
    --tree-shaking=true \
    --minify \
    --outdir=./dist/${lambda}
  )
done


