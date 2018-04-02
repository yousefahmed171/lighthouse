/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const Simulator = require('../../lib/dependency-graph/simulator/simulator');

class SimulatorArtifact extends ComputedArtifact {
  get name() {
    return 'Simulator';
  }

  /**
   * @param {{devtoolsLog: Array, settings: LH.ConfigSettings|undefined}} data
   * @param {!Artifacts} artifacts
   * @return {!Promise}
  */
  async compute_(data, artifacts) {
    const {throttlingMethod, throttling} = data.settings || {};
    const networkAnalysis = await artifacts.requestNetworkAnalysis(data.devtoolsLog);

    const options = {
      additionalRttByOrigin: networkAnalysis.additionalRttByOrigin,
      serverResponseTimeByOrigin: networkAnalysis.serverResponseTimeByOrigin,
    };

    switch (throttlingMethod) {
      case 'devtools':
      case 'provided':
        if (throttling) {
          // TODO(phulce): update this to use the constants when #4894 lands
          options.rtt = throttling.requestLatency / 3.75;
          options.throughput = throttling.downloadThroughputKbps * 1024;
        }

        options.cpuSlowdownMultiplier = 1;
        options.layoutTaskMultiplier = 1;
        break;
      case 'lantern':
        if (throttling) {
          options.rtt = throttling.rttMs;
          options.throughput = throttling.throughputKbps * 1024;
          options.cpuSlowdownMultiplier = throttling.cpuSlowdownMultiplier;
        }
        break;
      default:
        // intentionally fallback to simulator defaults
        break;
    }

    return new Simulator(options);
  }
}

module.exports = SimulatorArtifact;
