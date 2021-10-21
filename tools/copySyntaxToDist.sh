#!/bin/bash
for f in dist/__esm/*.js; do
    mv -- "$f" "${f%.js}.mjs"
done
mv dist/__esm/*.mjs dist/syntax
rm -r dist/__esm
cp src/syntax/*.ts dist/syntax/
rm -r dist/syntax/genMock
