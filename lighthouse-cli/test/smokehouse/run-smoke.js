/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const {promisify} = require('util');
const execAsync = promisify(require('child_process').exec);

const {server, serverForOffline} = require('../fixtures/static-server');

const smokehouseDir = 'lighthouse-cli/test/smokehouse/';

const smokes = {
  'ally': {
    config: smokehouseDir + 'a11y/a11y-config.js',
    expectations: 'a11y/expectations.js',
  },
  'dbw': {
    expectations: 'dobetterweb/dbw-expectations.js',
    config: smokehouseDir + 'dbw-config.js',
  },
  'redirects': {
    expectations: 'redirects/expectations.js',
    config: smokehouseDir + 'redirects-config.js',
  },
  'seo': {
    expectations: 'seo/expectations.js',
    config: smokehouseDir + 'seo-config.js',
  },
  'offline': {
    expectations: 'offline-local/offline-expectations.js',
    config: smokehouseDir + 'offline-config.js',
  },
  'byte': {
    expectations: 'byte-efficiency/expectations.js',
    config: smokehouseDir + 'byte-config.js',
  },
  'perf': {
    expectations: 'perf/expectations.js',
    config: 'lighthouse-core/config/perf-config.js',
  },
  'ttci': {
    expectations: 'tricky-ttci/expectations.js',
    config: 'lighthouse-core/config/default-config.js',
  },
  'pwa': {
    expectations: smokehouseDir + 'pwa-expectations.js',
    config: smokehouseDir + 'pwa-config.js',
  },
};


function displayOutput(cp) {
  console.log('\n\n')
  console.log(`Results for: ${cp.id}`);
  if (cp.code) {
    console.log(cp.message);
  }
  process.stdout.write(cp.stdout);
  process.stderr.write(cp.stderr);
  console.log(`End of results for: ${cp.id}`);
  console.log('\n\n')
}

/**
 * Update the report artifacts
 */
async function run() {
  // start webservers
  server.listen(10200, 'localhost');
  serverForOffline.listen(10503, 'localhost');

  const cmdPromises = [];
  for (const [id, {expectations, config}] of Object.entries(smokes)) {
    console.log('Running smoketest', {id, config, expectations});
    const cmd = `yarn smokehouse --config-path=${config} --expectations-path=${expectations}`;
    // const cmd = `yarn --help`;
    const p = execAsync(cmd, {timeout: 5 * 60 * 1000, encoding: 'utf8'}).then(cp => {
      cp.id = id;
      displayOutput(cp);
      return cp;
    }).catch(e => {
      e.code = e.code || 1;
      e.id = id;
      displayOutput(e);
      return e;
    });
    cmdPromises.push(p);
  }

  const smokeResults = await Promise.all(cmdPromises);

  await new Promise(res => server.close(res));
  await new Promise(res => serverForOffline.close(res));

  const failingTests = smokeResults.filter(res => !!res.code);
  if (failingTests.length) {
    const testNames = failingTests.map(t => t.id).join(', ');
    console.error(`We have ${failingTests.length} failing smoketests: ${testNames}`);
    process.exit(1);
  }

  process.exit(0);
}

run();


