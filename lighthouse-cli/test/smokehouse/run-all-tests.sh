#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

node lighthouse-cli/test/fixtures/static-server.js &
sleep 0.5s


FAIL=0
PIDS=""
CMDS=""

echo "starting"
for d in "$DIR"/*/ ; do
  bash "${d}run-tests.sh" &
  PIDS="$PIDS $!"
done

for job in $PIDS; do
    wait $job || let "FAIL += 1"
    # echo $job $FAIL
done


# kill test servers
kill $(jobs -p)

if [ "$FAIL" == "0" ];
then
    echo "No failures. \o/"
else
    echo "We have failures. ($FAIL of them)"
    exit 1
fi
