#!/bin/bash

set -Exeo pipefail

if [[ "${OS_NAME}" == macos* ]]; then
    wget https://packages.edgedb.com/macos/edgedb-${SLOT}_latest.nightly.pkg \
        -O edgedb.pkg -nv
    sudo env _EDGEDB_INSTALL_SKIP_BOOTSTRAP=1 installer \
        -dumplog -verbose -pkg "$(pwd)/edgedb.pkg" -target /
    rm edgedb.pkg

    # EdgeDB installer adds paths to /etc/paths.d,
    # and Github env setup doesn't seem to load that,
    # so do this manually.
    _path=$(/usr/libexec/path_helper -s |
            sed -E -e 's/.*:([^:]+EdgeDB[^:]+):.*/\1/g')

    echo ::add-path::${_path}

elif [[ "${OS_NAME}" == ubuntu* ]]; then
    curl https://packages.edgedb.com/keys/edgedb.asc \
        | sudo apt-key add -

    dist=$(awk -F"=" '/VERSION_CODENAME=/ {print $2}' /etc/os-release)
    [ -n "${dist}" ] || \
        dist=$(awk -F"[)(]+" '/VERSION=/ {print $2}' /etc/os-release)
    echo deb https://packages.edgedb.com/apt ${dist}.nightly main \
        | sudo tee /etc/apt/sources.list.d/edgedb.list

    sudo apt-get update
    sudo env _EDGEDB_INSTALL_SKIP_BOOTSTRAP=1 \
        apt-get install edgedb-${SLOT}
fi
