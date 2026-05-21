const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('google ads topbar does not render the user avatar chip', () => {
  const template = fs.readFileSync(path.join(__dirname, '..', 'views', 'google_ads.ejs'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'public', 'google_ads.css'), 'utf8');

  assert.doesNotMatch(template, /class="ga-avatar"/);
  assert.doesNotMatch(template, />伟全</);
  assert.doesNotMatch(styles, /\.ga-avatar\s*\{/);
});
