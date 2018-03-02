/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const Node = require('../../lib/dependency-graph/node');
const Simulator = require('../../lib/dependency-graph/simulator/simulator');

const COEFFICIENTS = {
  intercept: 1440,
  optimistic: -1.75,
  pessimistic: 2.73,
};

class FirstContentfulPaint extends ComputedArtifact {
  get name() {
    return 'FirstContentfulPaint';
  }

  /**
   * @param {!Node} dependencyGraph
   * @param {function()=} condition
   * @return {!Set<string>}
   */
  static getScriptUrls(dependencyGraph, condition) {
    const scriptUrls = new Set();

    dependencyGraph.traverse(node => {
      if (node.type === Node.TYPES.CPU) return;
      if (node.record._resourceType !== WebInspector.resourceTypes.Script) return;
      if (condition && !condition(node)) return;
      scriptUrls.add(node.record.url);
    });

    return scriptUrls;
  }

  /**
   * @param {!Node} dependencyGraph
   * @param {!TraceOfTabArtifact} traceOfTab
   * @return {!Node}
   */
  static getOptimisticGraph(dependencyGraph, traceOfTab) {
    const fcp = traceOfTab.timestamps.firstContentfulPaint;
    const blockingScriptUrls = FirstContentfulPaint.getScriptUrls(dependencyGraph, node => {
      return (
        node.endTime <= fcp && node.hasRenderBlockingPriority() && node.initiatorType !== 'script'
      );
    });

    return dependencyGraph.cloneWithRelationships(node => {
      if (node.endTime > fcp) return false;
      // Include EvaluateScript tasks for blocking scripts
      if (node.type === Node.TYPES.CPU) return node.isEvaluateScriptFor(blockingScriptUrls);
      // Include non-script-initiated network requests with a render-blocking priority
      return node.hasRenderBlockingPriority() && node.initiatorType !== 'script';
    });
  }

  /**
   * @param {!Node} dependencyGraph
   * @param {!TraceOfTabArtifact} traceOfTab
   * @return {!Node}
   */
  static getPessimisticGraph(dependencyGraph, traceOfTab) {
    const fcp = traceOfTab.timestamps.firstContentfulPaint;
    const blockingScriptUrls = FirstContentfulPaint.getScriptUrls(dependencyGraph, node => {
      return node.endTime <= fcp && node.hasRenderBlockingPriority();
    });

    return dependencyGraph.cloneWithRelationships(node => {
      if (node.endTime > fcp) return false;
      // Include EvaluateScript tasks for blocking scripts
      if (node.type === Node.TYPES.CPU) return node.isEvaluateScriptFor(blockingScriptUrls);
      // Include all network requests that had render-blocking priority (even script-initiated)
      return node.hasRenderBlockingPriority();
    });
  }

  static async computeLantern(data, artifacts) {
    const {trace, devtoolsLog} = data;
    const graph = await artifacts.requestPageDependencyGraph({trace, devtoolsLog});
    const traceOfTab = await artifacts.requestTraceOfTab(trace);
    const networkAnalysis = await artifacts.requestNetworkAnalysis(devtoolsLog);

    const optimisticGraph = FirstContentfulPaint.getOptimisticGraph(graph, traceOfTab);
    const pessimisticGraph = FirstContentfulPaint.getPessimisticGraph(graph, traceOfTab);

    const options = {...networkAnalysis, ...data.throttling};
    const optimisticEstimate = new Simulator(optimisticGraph, options).simulate().timeInMs;
    const pessimisticEstimate = new Simulator(pessimisticGraph, options).simulate().timeInMs;

    const timing =
      COEFFICIENTS.intercept +
      COEFFICIENTS.optimistic * optimisticEstimate +
      COEFFICIENTS.pessimistic * pessimisticEstimate;

    return {
      timing,
      optimisticEstimate,
      pessimisticEstimate,
      optimisticGraph,
      pessimisticGraph,
    };
  }

  /**
   * @param {{trace: Object, devtoolsLog: Object, throttling: Object}} data
   * @return {Object}
   */
  async compute_(data, artifacts) {
    if (data.throttling.method !== 'lantern') {
      const traceOfTab = await artifacts.requestTraceOfTab(data.trace);
      return {
        timing: traceOfTab.timings.firstContentfulPaint,
        timestamp: traceOfTab.timestamps.firstContentfulPaint,
      };
    }

    return FirstContentfulPaint.computeLantern(data, artifacts);
  }
}

/**
 * @typedef MetricResult
 * @property {number} timing
 * @property {number|undefined} timestamp
 * @property {number|undefined} optimisticEstimate
 * @property {number|undefined} pessimisticEstimate
 * @property {!Node|undefined} optimisticGraph
 * @property {!Node|undefined} pessimisticGraph
 */

module.exports = FirstContentfulPaint;
