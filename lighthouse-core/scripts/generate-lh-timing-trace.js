/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Technically, it's fine for usertiming measures to overlap, however non-async events make
 * for a much clearer UI in traceviewer. We do this check to make sure we aren't passing off
 * async-like measures as non-async.
 * @param {!PerformanceEntry} entry user timing entry
 * @param {!Array<PerformanceEntry>} prevEntries user timing entries
 */
function checkEventOverlap(entry, prevEntries) {
  for (const prevEntry of prevEntries) {
    const prevEnd = prevEntry.startTime + prevEntry.duration;
    const thisEnd = entry.startTime + entry.duration;
    const isOverlap = prevEnd > entry.startTime && prevEnd < thisEnd;
    if (isOverlap) {
      throw new Error(`Two measures overlap! ${prevEntry.name} & ${entry.name}`);
    }
  }
}

/**
 * Generates a chromium trace file from user timing measures
 * Adapted from https://github.com/tdresser/performance-observer-tracing
 * @param {!Array<PerformanceEntry>} entries user timing entries
 */
function generateTraceEvents(entries) {
  const currentTrace = [];
  let id = 0;

  entries.sort((a, b) => a.startTime - b.startTime);
  entries.forEach((entry, i) => {
    checkEventOverlap(entry, entries.slice(0, i));

    const traceEvent = {
      name: entry.name,
      cat: entry.entryType,
      ts: entry.startTime * 1000,
      dur: entry.duration * 1000,
    };

    if (entry.entryType !== 'measure') throw new Error('Unexpected entryType!');
    traceEvent.pid = 'Lighthouse';
    traceEvent.tid = 'measures';

    if (entry.duration === 0) {
      traceEvent.ph = 'n';
      traceEvent.s = 't';
    } else {
      traceEvent.ph = 'X';
    }

    traceEvent.id = '0x' + id.toString(16);
    id++;

    const args = {};
    for (const key of Object.keys(entry)) {
      const value = entry[key];
      if (key === 'entryType' || key === 'name' || key === 'toJSON') {
        continue;
      }
      args[key] = value;
    }
    traceEvent.args = args;

    currentTrace.push(traceEvent);
  });

  return currentTrace;
}

/**
 * Writes a trace file to disk
 * @param {!Array<PerformanceEntry>} entries user timing entries
 * @param {?string} traceFilePath where to save the trace file
 */
function saveTraceOfTimings(entries, traceFilePath) {
  const events = generateTraceEvents(entries);

  const jsonStr = `
  { "traceEvents": [
    ${events.map(evt => JSON.stringify(evt)).join(',\n')}
  ]}`;

  if (!traceFilePath) {
    traceFilePath = path.resolve(process.cwd(), 'run-timing.trace.json');
  }
  fs.writeFileSync(traceFilePath, jsonStr, 'utf8');
  process.stdout.write(`
  > Timing trace file saved to: ${traceFilePath}
  > Open this file in chrome://tracing

`);
}

/**
 * Takes filename of LHR object. The primary entrypoint on CLI
 */
function saveTraceFromCLI() {
  const printErrorAndQuit = msg => {
    process.stderr.write(`ERROR:
  > ${msg}
  > Example:
  >     yarn timing results.json

`);
    process.exit(1);
  };

  if (!process.argv[2]) {
    printErrorAndQuit('Lighthouse JSON results path not provided');
  }
  const filename = path.resolve(process.cwd(), process.argv[2]);
  if (!fs.existsSync(filename)) {
    printErrorAndQuit('Lighthouse JSON results not found.');
  }

  const lhrObject = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const traceFilePath = `${filename}.run-timing.trace.json`;
  saveTraceOfTimings(lhrObject.timing.entries, traceFilePath);
}

if (require.main === module) {
  saveTraceFromCLI();
} else {
  module.exports = {generateTraceEvents, saveTraceOfTimings, saveTraceFromCLI};
}
