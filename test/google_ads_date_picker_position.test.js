const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    }
  };
}

function loadGoogleAdsAppConfig(overrides = {}) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'google_ads.js'), 'utf8');
  const sandbox = {
    console,
    Math,
    URLSearchParams,
    localStorage: createMemoryStorage(),
    sessionStorage: createMemoryStorage(),
    document: overrides.document || {
      querySelector(selector) {
        if (selector === '.ga-table-panel') {
          return {
            getBoundingClientRect() {
              return { top: 200 };
            }
          };
        }
        return {
          scrollTop: 72,
          scrollLeft: 0,
          style: {
            setProperty() {}
          }
        };
      }
    },
    window: {
      GOOGLE_ADS_PAGE: 'campaigns',
      innerWidth: 1400,
      requestAnimationFrame(callback) {
        callback();
      },
      setTimeout() {},
      location: {
        pathname: '/aw/campaigns',
        search: ''
      }
    },
    Vue: {
      createApp(config) {
        sandbox.appConfig = config;
        return {
          mount() {
            return config;
          }
        };
      }
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'public/google_ads.js' });
  return sandbox.appConfig;
}

test('open date picker repositions when the campaign page scrolls', () => {
  const template = fs.readFileSync(path.join(__dirname, '..', 'views', 'google_ads.ejs'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'public', 'google_ads.css'), 'utf8');
  const config = loadGoogleAdsAppConfig();
  const dateButtonRect = { bottom: 220, left: 700 };
  const context = {
    ...config.data(),
    ...config.methods,
    showDatePicker: true,
    $refs: {
      dateSelectRef: {
        getBoundingClientRect() {
          return dateButtonRect;
        }
      }
    },
    $nextTick(callback) {
      callback();
    }
  };

  const style = config.computed.dropdownStyle.call(context);
  assert.equal(style.position, 'fixed');
  assert.equal(style.top, '228px');
  assert.equal(style.left, '700px');

  assert.equal(context.datePickerPositionTick, 0);
  config.methods.handleScroll.call(context);
  assert.equal(context.isContextBarHidden, true);
  assert.ok(context.datePickerPositionTick > 0);
  assert.match(template, /'ga-page-head--date-open':\s*showDatePicker/);
  assert.match(styles, /\.ga-page-head\s*\{[^}]*z-index:\s*60;/s);
  assert.match(styles, /\.ga-page-head--date-open\s*\{[^}]*z-index:\s*80;/s);
});

test('opening and changing the date picker jumps to selected date without smooth scrolling', () => {
  const scrollIntoViewCalls = [];
  const config = loadGoogleAdsAppConfig({
    document: {
      querySelector(selector) {
        if (selector === '.date-picker-dropdown .calendar-day.selected') {
          return {
            scrollIntoView(options) {
              scrollIntoViewCalls.push(options);
            }
          };
        }
        return { scrollTop: 0 };
      }
    }
  });
  const context = {
    ...config.data(),
    ...config.methods,
    startDate: new Date(2026, 4, 20),
    endDate: new Date(2026, 4, 20),
    appliedDateOption: 'custom',
    $nextTick(callback) {
      callback();
    },
    $refs: {
      dateSelectRef: {}
    }
  };

  config.methods.toggleDatePicker.call(context, { stopPropagation() {} });
  config.methods.selectDateOption.call(context, 'custom');

  assert.equal(scrollIntoViewCalls.length, 2);
  assert.ok(scrollIntoViewCalls.every(call => call.behavior === 'auto'));
  assert.ok(scrollIntoViewCalls.every(call => call.block === 'center'));
});

test('left preset date options apply immediately while custom keeps Apply flow', () => {
  const template = fs.readFileSync(path.join(__dirname, '..', 'views', 'google_ads.ejs'), 'utf8');
  const quickOptions = [
    'today',
    'yesterday',
    'thisWeekSunSat',
    'thisWeekMonSun',
    'last7Days',
    'lastWeekSunSat',
    'lastWeekMonSun',
    'lastBusinessWeek',
    'last14Days',
    'thisMonth',
    'last30Days',
    'lastMonth',
    'allTime'
  ];

  assert.match(template, /@click="selectDateOption\('custom'\)"/);
  for (const option of quickOptions) {
    assert.match(template, new RegExp(`@click="applyQuickDateOption\\('${option}'\\)"`));
    assert.doesNotMatch(template, new RegExp(`@click="selectDateOption\\('${option}'\\)"`));
  }
});
