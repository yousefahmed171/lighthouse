/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');

class FirstContentfulPaint extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'first-contentful-paint',
      description: 'First Contentful Paint',
      failureDescription: 'First Contentful Paint',
      helpText: 'Foo',
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static async audit(artifacts, context) {
    const result = await artifacts.requestFirstContentfulPaint({
      trace: artifacts.traces.defaultPass,
      devtoolsLog: artifacts.devtoolsLogs.defaultPass,
      throttling: context.config.settings.throttling,
    })

    return {
      rawValue: result.timing,
      score: 100 - 100 * (result.timing / 10000),
    };
  }
}

module.exports = FirstContentfulPaint;
