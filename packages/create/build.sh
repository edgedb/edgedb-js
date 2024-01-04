#!/usr/bin/env sh

set -e

rm -rf dist
yarn run -B tsc

# Copy each recipe's template directories to build directory recursively
for recipe in $(ls -d src/recipes/*/); do
  # Check if recipe contains a template directory
  if [ ! -d ${recipe}template ]; then
    continue
  fi
  cp -rv ${recipe}template dist/recipes/$(basename ${recipe})
done
