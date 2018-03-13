#!/usr/bin/env bash

config="lighthouse-core/config/default.js"
expectations="lighthouse-cli/test/smokehouse/tricky-ttci/expectations.js"

if [[ -n "$1" && "$1" == '--share-vars-and-exit' ]]; then
  return
fi

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
. $DIR/../run-single-test.sh
