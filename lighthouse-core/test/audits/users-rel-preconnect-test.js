/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

/* eslint-env mocha */

const UsesRelPreconnect = require('../../audits/uses-rel-preconnect.js');
const assert = require('assert');
const Util = require('../../report/v2/renderer/util');

const mainResource = {
  url: 'https://www.example.com/',
  _endTime: 1,
};
const mainResourceRecord = {
  url: 'https://www.example.com/',
};

describe('Performance: uses-rel-preconnect audit', () => {
  it(`shouldn't suggest preconnect for same origin`, async () => {
    const networkRecords = [
      mainResourceRecord,
      {
        url: 'https://www.example.com/request',
      },
    ];
    const artifacts = {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      requestMainResource: () => Promise.resolve(mainResource),
    };

    const {score, rawValue, details} = await UsesRelPreconnect.audit(artifacts);
    assert.equal(score, 1);
    assert.equal(rawValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`shouldn't suggest preconnect when initiator is main resource`, async () => {
    const networkRecords = [
      mainResourceRecord,
      {
        url: 'https://cdn.example.com/request',
        initiatorRequest: () => mainResource,
      },
    ];
    const artifacts = {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      requestMainResource: () => Promise.resolve(mainResource),
    };

    const {score, rawValue, details} = await UsesRelPreconnect.audit(artifacts);
    assert.equal(score, 1);
    assert.equal(rawValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`shouldn't suggest non http(s) protocols as preconnect`, async () => {
    const networkRecords = [
      mainResourceRecord,
      {
        url: 'data:text/plain;base64,hello',
        initiatorRequest: () => null,
      },
    ];
    const artifacts = {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      requestMainResource: () => Promise.resolve(mainResource),
    };

    const {score, rawValue, details} = await UsesRelPreconnect.audit(artifacts);
    assert.equal(score, 1);
    assert.equal(rawValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`shouldn't suggest preconnect when already connected to the origin`, async () => {
    const networkRecords = [
      mainResourceRecord,
      {
        url: 'https://cdn.example.com/request',
        initiatorRequest: () => null,
        timing: {
          dnsStart: -1,
          dnsEnd: -1,
          connectEnd: -1,
          connectStart: -1,
        },
      },
    ];
    const artifacts = {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      requestMainResource: () => Promise.resolve(mainResource),
    };

    const {score, rawValue, details} = await UsesRelPreconnect.audit(artifacts);
    assert.equal(score, 1);
    assert.equal(rawValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`shouldn't suggest preconnect when request has been fired after 15s`, async () => {
    const networkRecords = [
      mainResourceRecord,
      {
        url: 'https://cdn.example.com/request',
        initiatorRequest: () => null,
        _startTime: 16,
      },
    ];
    const artifacts = {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      requestMainResource: () => Promise.resolve(mainResource),
    };

    const {score, rawValue, details} = await UsesRelPreconnect.audit(artifacts);
    assert.equal(score, 1);
    assert.equal(rawValue, 0);
    assert.equal(details.items.length, 0);
  });

  it(`should only list an origin once`, async () => {
    const networkRecords = [
      mainResourceRecord,
      {
        url: 'https://cdn.example.com/first',
        initiatorRequest: () => null,
        _startTime: 2,
        timing: {
          dnsStart: 100,
          connectEnd: 300,
        },
      },
      {
        url: 'https://cdn.example.com/second',
        initiatorRequest: () => null,
        _startTime: 3,
        timing: {
          dnsStart: 300,
          connectEnd: 400,
        },
      },
    ];
    const artifacts = {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      requestMainResource: () => Promise.resolve(mainResource),
    };

    const {rawValue, extendedInfo} = await UsesRelPreconnect.audit(artifacts);
    assert.equal(rawValue, 200);
    assert.equal(extendedInfo.value.length, 1);
    assert.deepStrictEqual(extendedInfo.value, [{url: 'https://cdn.example.com', wastedMs: Util.formatMilliseconds(200)}]);
  });

  it(`should give a list of preconnected origins`, async () => {
    const networkRecords = [
      mainResourceRecord,
      {
        url: 'https://cdn.example.com/first',
        initiatorRequest: () => null,
        _startTime: 2,
        timing: {
          dnsStart: 100,
          connectEnd: 300,
        },
      },
      {
        url: 'https://othercdn.example.com/second',
        initiatorRequest: () => null,
        _startTime: 3,
        timing: {
          dnsStart: 300,
          connectEnd: 400,
        },
      },
    ];
    const artifacts = {
      devtoolsLogs: {[UsesRelPreconnect.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      requestMainResource: () => Promise.resolve(mainResource),
    };

    const {rawValue, extendedInfo} = await UsesRelPreconnect.audit(artifacts);
    assert.equal(rawValue, 200);
    assert.equal(extendedInfo.value.length, 2);
    assert.deepStrictEqual(extendedInfo.value, [
      {url: 'https://cdn.example.com', wastedMs: Util.formatMilliseconds(200)},
      {url: 'https://othercdn.example.com', wastedMs: Util.formatMilliseconds(100)},
    ]);
  });
});
