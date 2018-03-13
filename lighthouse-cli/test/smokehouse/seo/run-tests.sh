#!/usr/bin/env bash

config="lighthouse-cli/test/smokehouse/seo-config.js"
expectations="lighthouse-cli/test/smokehouse/seo/expectations.js"

if [[ -n "$1" && "$1" == '--share-vars-and-exit' ]]; then
  return
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
. $DIR/../run-single-test.sh
