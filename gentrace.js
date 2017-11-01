'use strict';

const currentTrace = [];

let id = 0;

function generateTrace() {
  for (let entry of entries) {
    const traceEvent = {
      name: entry.name,
      cat: entry.entryType,
      ts: entry.startTime * 1000,
      dur: entry.duration * 1000
    };

    traceEvent.pid = 'Measurements';

    switch (entry.entryType) {
      case 'mark':
        traceEvent.pid = 'Marks';
        break;
      case 'measure':
        if (entry.name.startsWith('audit-'))
          traceEvent.tid = 'Audits';
        else if (entry.name.startsWith('gather-'))
          traceEvent.tid = 'Gatherers';
        else
          traceEvent.tid = 'TopLevelMeasures';
        break;
      default:
        traceEvent.pid = 'Primary';
    }

    if (entry.entryType == 'resource') {
      entry.url = traceEvent.name;
      traceEvent.name = 'resource';
    }

    if (entry.duration == 0) {
      traceEvent.ph = 'n';
      traceEvent.s = 't';
    } else {
      traceEvent.ph = 'X';
    }

    traceEvent.id = '0x' + id.toString(16);
    id++;

    let args = {};
    for (let key in entry) {
      let value = entry[key];
      if (key == 'entryType' || key == 'name' || key == 'toJSON') {
        continue;
      }
      args[key] = value;
    }
    traceEvent.args = args;

    currentTrace.push(traceEvent);

//     if (entry.duration != 0) {
//       let traceEventEnd = {};
//       for (let key in traceEvent) {
//         traceEventEnd[key] = traceEvent[key];
//       }
//       traceEventEnd.ph = 'e';
//       traceEventEnd.ts = traceEvent.ts + entry.duration * 1000;
//       currentTrace.push(traceEventEnd);
//     }
  }
}

window.generateTrace = generateTrace;
// });

// observer.observe({entryTypes: [
//   'resource',
//   'navigation',
//   'paint',
//   'longtask',
//   'mark',
//   'measure'
// ]});

/**
   * Downloads a file using a[download].
   * @param {!string} jsonStr string of JSON to save
   */
function saveFile(jsonStr) {
  const blob = new Blob([jsonStr], {type: 'application/json'});
  const filename = `${document.location.host}_${new Date().toISOString()}.trace.json`
    // Replace characters that are unfriendly to filenames
    .replace(/[/?<>:*|"]/g, '-');
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = filename;
  a.href = href;
  document.body.appendChild(a); // Firefox requires anchor to be in the DOM.
  a.click();

  // Cleanup
  document.body.removeChild(a);
  setTimeout(_ => URL.revokeObjectURL(href), 500);
}

window.getPerformanceObserverTraceEvents = function() {
  return currentTrace;
};

window.getPerformanceObserverTrace = function() {
  return `
{ "traceEvents": [
  ${currentTrace.map(evt => JSON.stringify(evt)).join(',\n')}
]}`;
};

window.downloadPerformanceObserverTrace = function() {
  saveFile(window.getPerformanceObserverTrace());
};
