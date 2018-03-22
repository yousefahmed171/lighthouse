/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');
const UnusedBytes = require('./byte-efficiency/byte-efficiency-audit');
const URL = require('../lib/url-shim');
const PRECONNECT_SOCKET_MAX_IDLE = 10;

const learnMoreUrl =
  'https://developers.google.com/web/fundamentals/performance/resource-prioritization#preconnect';

class UsesRelPreconnectAudit extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'uses-rel-preconnect',
      description: 'Avoid multiple, costly round trips to any origin',
      informative: true,
      helpText: 'Consider using<link rel="preconnect dns-prefetch"> to set up early connections ' +
        ' before an HTTP request is actually sent to the server. This will reduce multiple, ' +
        `costly round trips to any origin. [Learn more](${learnMoreUrl}).`,
      requiredArtifacts: ['devtoolsLogs'],
      scoringMode: Audit.SCORING_MODES.NUMERIC,
    };
  }

  /**
   * Check is the connection is already open
   * @param {!WebInspector.NetworkRequest} record
   * @return {!boolean}
   */
  static hasAlreadyConnectedToOrigin(record) {
    return record.timing && record.timing.dnsEnd - record.timing.dnsStart === 0 &&
      record.timing.connectEnd - record.timing.connectStart === 0;
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static async audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[UsesRelPreconnectAudit.DEFAULT_PASS];
    let maxWasted = 0;

    const [networkRecords, mainResource] = await Promise.all([
      artifacts.requestNetworkRecords(devtoolsLogs),
      artifacts.requestMainResource(devtoolsLogs),
    ]);

    const preconnectResults = {};
    networkRecords
      // filter out all resources that have a different origin
      .filter(record => !URL.originsMatch(mainResource.url, record.url))
      // filter out all resources that are not loaded by the document
      .filter(record => {
        return record.initiatorRequest() !== mainResource && record !== mainResource;
      // filter out urls that do not have an origin
      }).filter(record => {
        return !!URL.getOrigin(record.url);
      // filter out all resources where origins are already resolved
      }).filter(record => {
        return !UsesRelPreconnectAudit.hasAlreadyConnectedToOrigin(record);
      }).forEach(record => {
        const requestDelay = record._startTime - mainResource._endTime;
        const recordOrigin = URL.getOrigin(record.url);

        if (preconnectResults[recordOrigin]) {
          return;
        }

        // make sure the requests are below the PRECONNECT_SOCKET_MAX_IDLE (10s) mark
        if (Math.max(0, requestDelay) < PRECONNECT_SOCKET_MAX_IDLE) {
          preconnectResults[recordOrigin] = record;
        }
      });

    const results = Object.values(preconnectResults).map(record => {
      const wastedMs = record.timing.connectEnd - record.timing.dnsStart;
      maxWasted = Math.max(wastedMs, maxWasted);

      return {
        url: new URL(record.url).origin,
        wastedMs: Util.formatMilliseconds(wastedMs),
      };
    });

    const headings = [
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'wastedMs', itemType: 'text', text: 'Potential Savings'},
    ];
    const details = Audit.makeTableDetails(headings, results);

    return {
      score: UnusedBytes.scoreForWastedMs(maxWasted),
      rawValue: maxWasted,
      displayValue: Util.formatMilliseconds(maxWasted),
      extendedInfo: {
        value: results,
      },
      details,
    };
  }
}

module.exports = UsesRelPreconnectAudit;
