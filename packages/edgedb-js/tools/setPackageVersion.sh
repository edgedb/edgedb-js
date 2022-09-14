#!/bin/bash

sed -i.bak -e "s/\"0.0.0\"/\"$npm_package_version\"/" dist/index.shared*
rm dist/index.shared*.bak
