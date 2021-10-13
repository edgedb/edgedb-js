#!/bin/bash
for f in dist/__esm/syntax/*.js; do
    mv -- "$f" "${f%.js}.mjs"
done
mv dist/__esm/syntax/*.mjs dist/syntax
rm -r dist/__esm
cp -u src/syntax/*.ts dist/syntax/
rm -r dist/syntax/genMock
