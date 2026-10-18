const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const naviScript = fs.readFileSync(path.join(__dirname, '../components/naviinfo/scripts/naviDirectory.js'), 'utf8');
const serviScript = fs.readFileSync(path.join(__dirname, '../components/serviinfo/scripts/serviDirectory.js'), 'utf8');

class FakeContainer {
  constructor(html) {
    this.html = html;
    this.cards = [];
  }

  get innerHTML() { return this.html; }

  set innerHTML(value) {
    this.html = value;
    this.cards = [];
  }

  querySelectorAll(selector) {
    return selector === 'article[data-place-id]' ? this.cards : [];
  }

  appendChild(card) {
    card.container = this;
    this.cards.push(card);
    this.html += card.html;
    return card;
  }

  insertAdjacentHTML(_position, html) {
    this.html += html;
  }
}

function response(ok, body) {
  return { ok, json: async () => body };
}

function runNavi(fetch) {
  const container = new FakeContainer('STATIC NAVI CARD');
  const group = {
    dataset: { category: 'Banks' },
    querySelector: () => container
  };
  const window = {
    API_BASE: 'https://api.example.test',
    location: { hostname: 'example.test' },
    initializeSearchHandlers() {},
    initYolaGoogleMap() {}
  };
  const document = {
    querySelectorAll(selector) {
      return selector === '.section3[data-category]' ? [group] : [];
    },
    createElement() {
      const holder = { firstElementChild: null };
      Object.defineProperty(holder, 'innerHTML', {
        set(html) {
          const match = html.match(/data-place-id="([^"]*)"/);
          holder.firstElementChild = {
            html,
            dataset: { placeId: match ? match[1] : '' }
          };
        }
      });
      return holder;
    }
  };
  vm.runInNewContext(naviScript, {
    window,
    document,
    fetch,
    console: { error() {} },
    URLSearchParams
  });
  return { load: window.loadNaviDirectory, container };
}

function runServi(fetch) {
  const containers = [
    new FakeContainer('STATIC PLUMBING CARD'),
    new FakeContainer('STATIC ELECTRICAL CARD')
  ];
  const groups = ['Plumbing', 'Electrical'].map((category, index) => ({
    dataset: { category },
    querySelector: () => containers[index]
  }));
  const directory = {
    dataset: {},
    querySelectorAll(selector) {
      if (selector === '.section4-container') return containers;
      if (selector === '.section3[data-category]') return groups;
      return [];
    }
  };
  const errorState = { hidden: true, textContent: '' };
  const document = {
    getElementById(id) {
      return id === 'directory' ? directory : id === 'directoryError' ? errorState : null;
    }
  };
  const window = {
    API_BASE: 'https://api.example.test',
    API_BASE_CANDIDATES: ['https://api.example.test', 'https://backup.example.test'],
    location: { hostname: 'example.test' },
    initServiFilters() {}
  };
  vm.runInNewContext(serviScript, {
    window,
    document,
    fetch,
    console: { error() {} }
  });
  return { load: window.loadServiDirectory, containers, directory, errorState };
}

test('NaviInfo keeps static cards when its directory request fails', async () => {
  const { load, container } = runNavi(async () => { throw new Error('offline'); });

  assert.equal(await load(), false);
  assert.equal(container.innerHTML, 'STATIC NAVI CARD');

  const invalid = runNavi(async () => response(true, {}));
  assert.equal(await invalid.load(), false);
  assert.equal(invalid.container.innerHTML, 'STATIC NAVI CARD');
});

test('NaviInfo replaces static cards with database results, including an empty result', async () => {
  const item = {
    slug: 'yola-bank',
    displayName: 'Yola Bank',
    category: 'Banks',
    area: 'Yola',
    coordinates: {}
  };
  const loaded = runNavi(async () => response(true, { items: [item] }));

  assert.equal(await loaded.load(), true);
  assert.doesNotMatch(loaded.container.innerHTML, /STATIC NAVI CARD/);
  assert.match(loaded.container.innerHTML, /Yola Bank/);

  const empty = runNavi(async () => response(true, { items: [] }));
  assert.equal(await empty.load(), true);
  assert.equal(empty.container.innerHTML, '');
});

test('ServiInfo keeps static cards when its directory request fails', async () => {
  const { load, containers, errorState } = runServi(async () => { throw new Error('offline'); });

  assert.equal(await load(), false);
  assert.equal(containers[0].innerHTML, 'STATIC PLUMBING CARD');
  assert.equal(containers[1].innerHTML, 'STATIC ELECTRICAL CARD');
  assert.equal(errorState.hidden, false);

  const invalid = runServi(async () => response(true, {}));
  assert.equal(await invalid.load(), false);
  assert.equal(invalid.containers[0].innerHTML, 'STATIC PLUMBING CARD');
  assert.equal(invalid.containers[1].innerHTML, 'STATIC ELECTRICAL CARD');

  const unavailable = runServi(async () => response(false, { error: 'offline' }));
  assert.equal(await unavailable.load(), false);
  assert.equal(unavailable.containers[0].innerHTML, 'STATIC PLUMBING CARD');
  assert.equal(unavailable.containers[1].innerHTML, 'STATIC ELECTRICAL CARD');
});

test('ServiInfo makes only one API request and keeps static cards when it fails', async () => {
  const calls = [];
  const loaded = runServi(async url => {
    calls.push(url);
    throw new Error('offline');
  });

  assert.equal(await loaded.load(), false);
  assert.deepEqual(calls, ['https://api.example.test/api/content/professionals?limit=200']);
  assert.equal(loaded.containers[0].innerHTML, 'STATIC PLUMBING CARD');
  assert.equal(loaded.containers[1].innerHTML, 'STATIC ELECTRICAL CARD');
});

test('ServiInfo replaces static cards with database results, including an empty result', async () => {
  const item = {
    displayName: 'Yola Plumbing',
    profession: 'Plumber',
    category: 'Plumbing',
    slug: 'yola-plumbing',
    areas: ['Yola']
  };
  const loaded = runServi(async () => response(true, { items: [item] }));

  assert.equal(await loaded.load(), true);
  assert.doesNotMatch(loaded.containers[0].innerHTML, /STATIC PLUMBING CARD/);
  assert.match(loaded.containers[0].innerHTML, /Yola Plumbing/);
  assert.equal(loaded.containers[1].innerHTML, '');
  assert.equal(loaded.directory.dataset.apiLoaded, 'true');

  const empty = runServi(async () => response(true, { items: [] }));
  assert.equal(await empty.load(), true);
  assert.equal(empty.containers[0].innerHTML, '');
  assert.equal(empty.containers[1].innerHTML, '');
});
