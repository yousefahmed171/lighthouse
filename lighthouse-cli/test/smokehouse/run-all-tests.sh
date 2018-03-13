#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

node lighthouse-cli/test/fixtures/static-server.js &
sleep 0.5s

FAIL=0
PIDS=""
CMDS=""

for d in "$DIR"/*/ ; do
  . "${d}run-tests.sh" --share-vars-and-exit
  node $DIR/smokehouse.js --config-path=$config --expectations-path=$expectations &
  PIDS="$PIDS $!"
done

for job in $PIDS; do
    wait $job || let "FAIL += 1"
done

# kill static-server
kill $(jobs -p)

echo ""
if [ "$FAIL" == "0" ]; then
    echo "PASS: No smoketests failures. \o/"
else
    echo "FAIL."
    echo "run-all-tests found ($FAIL) failing smoketests"
    exit 1
fi
