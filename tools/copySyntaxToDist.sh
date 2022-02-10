#!/bin/bash
for f in dist/__esm/syntax/*.js; do
    mv -- "$f" "${f%.js}.mjs"
done
mv dist/__esm/syntax/*.mjs dist/syntax
rm -r dist/__esm
cp src/syntax/*.ts dist/syntax/
rm -rf dist/syntax/genMock
