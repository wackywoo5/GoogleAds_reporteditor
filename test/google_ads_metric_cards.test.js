const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('ad group metric cards show conversions before cost', () => {
  const script = fs.readFileSync(path.join(__dirname, '..', 'public', 'google_ads.js'), 'utf8');
  const adGroupsCards = script.match(/if \(this\.pageMode === 'adgroups'\) \{\s*return \[(?<cards>[\s\S]*?)\];\s*\}/);

  assert.ok(adGroupsCards, 'Expected ad group metric cards branch to exist');

  const cards = adGroupsCards.groups.cards;
  assert.ok(cards.indexOf("label: 'Conversions'") < cards.indexOf("label: 'Cost'"));
});
