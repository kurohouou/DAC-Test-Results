(() => {
  'use strict';

  const IRE_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  const SIGNAL_CONFIG = {
    rgb: {
      key: 'rgb',
      label: 'RGB Full Range',
      shortLabel: 'RGB',
      csvPath: './data/rgb.csv',
      defaultRef: [0, 70, 140, 210, 280, 350, 420, 490, 560, 630, 700],
      refNote: '1 IRE = 7 mV (700 mV)',
    },
    component: {
      key: 'component',
      label: 'Component (YPbPr)',
      shortLabel: 'YPbPr',
      csvPath: './data/component.csv',
      defaultRef: [0, 70, 140, 210, 280, 350, 420, 490, 560, 630, 700],
      refNote: '1 IRE = 7 mV (700 mV)',
    },
    svideo: {
      key: 'svideo',
      label: 'S-Video',
      shortLabel: 'S-Video',
      csvPath: './data/svideo.csv',
      defaultRef: [0, 71.4, 142.8, 214.2, 285.6, 357, 428.4, 499.8, 571.2, 642.6, 714],
      refNote: '1 IRE = 7.14 mV (714 mV)',
    },
    composite: {
      key: 'composite',
      label: 'Composite',
      shortLabel: 'Composite',
      csvPath: './data/composite.csv',
      defaultRef: [0, 71.4, 142.8, 214.2, 285.6, 357, 428.4, 499.8, 571.2, 642.6, 714],
      refNote: '1 IRE = 7.14 mV (714 mV)',
    },
  };

  const SERIES_COLORS = [
    '#22c55e',
    '#38bdf8',
    '#f97316',
    '#f43f5e',
    '#eab308',
    '#ec4899',
  ];

  const RATING_META = {
    5: { stars: '★★★★★', label: 'Reference', short: '5★ Ref', cls: 'grade-5' },
    4: { stars: '★★★★', label: 'Great', short: '4★ Great', cls: 'grade-4' },
    3: { stars: '★★★', label: 'Good', short: '3★ Good', cls: 'grade-3' },
    2: { stars: '★★', label: 'Useable', short: '2★ Useable', cls: 'grade-2' },
    1: { stars: '★', label: 'Avoid', short: '1★ Avoid', cls: 'grade-1' },
    0: { stars: '—', label: 'Unrated', short: 'Unrated', cls: 'grade-0' },
  };

  const FOOTNOTE_TOOLTIPS = {
    4: 'Reported ICY BOX sync timing quirk on some monitors (test with Sonic 2P interlaced mode).',
    3: 'WARNING: Newer Tendak units switched from CM6616S to ZY6511-EX and do NOT work with MiSTer.',
    2: 'Outputs RGBHV only (not RGBS). Requires an external sync combiner if monitor needs RGBS.',
    1: 'Chipset inferred from voltage curve signature; shell not opened for 100% confirmation.',
  };

  // Application State
  const state = {
    datasets: {}, // signalKey -> { reference: number[], refNote: string, items: Item[] }
    snesCurves: { snes: null, hcfr: null },
    allItemsById: new Map(),
    tab: 'rgb',
    query: '',
    rating: 'all',
    ic: '',
    sort: 'sheet-asc',
    hideIncomplete: false,
    heatmap: true,
    showDeltas: false,
    chartMode: 'delta', // 'delta' | 'absolute'
    showSnesCurve: true,
    chartCollapsed: false,
    plottedIds: [],
    hoveredIreIdx: null,
  };

  // DOM Elements
  const els = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    signalTabs: document.getElementById('signalTabs'),
    summaryStats: document.getElementById('summaryStats'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    icFilter: document.getElementById('icFilter'),
    sortSelect: document.getElementById('sortSelect'),
    ratingPills: document.getElementById('ratingPills'),
    hideIncompleteToggle: document.getElementById('hideIncompleteToggle'),
    heatmapToggle: document.getElementById('heatmapToggle'),
    deltaSubtextToggle: document.getElementById('deltaSubtextToggle'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    collapseChartBtn: document.getElementById('collapseChartBtn'),
    chartBody: document.getElementById('chartBody'),
    showSnesCurveToggle: document.getElementById('showSnesCurveToggle'),
    chartPresetSelect: document.getElementById('chartPresetSelect'),
    clearChartBtn: document.getElementById('clearChartBtn'),
    selectedSeriesBar: document.getElementById('selectedSeriesBar'),
    chartStage: document.getElementById('chartStage'),
    ireChartSvg: document.getElementById('ireChartSvg'),
    chartTooltip: document.getElementById('chartTooltip'),
    resultsCountText: document.getElementById('resultsCountText'),
    copyShareLinkBtn: document.getElementById('copyShareLinkBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    errorBanner: document.getElementById('errorBanner'),
    tableHeaderRow: document.getElementById('tableHeaderRow'),
    thSignal: document.getElementById('thSignal'),
    referenceRow: document.getElementById('referenceRow'),
    resultsTbody: document.getElementById('resultsTbody'),
    openCsvBuilderBtn: document.getElementById('openCsvBuilderBtn'),
    csvModalBackdrop: document.getElementById('csvModalBackdrop'),
    closeCsvModalBtn: document.getElementById('closeCsvModalBtn'),
    csvBuilderForm: document.getElementById('csvBuilderForm'),
    bSignal: document.getElementById('bSignal'),
    bName: document.getElementById('bName'),
    bIc: document.getElementById('bIc'),
    bDate: document.getElementById('bDate'),
    bPatGen: document.getElementById('bPatGen'),
    bRating: document.getElementById('bRating'),
    bUrl: document.getElementById('bUrl'),
    bNote: document.getElementById('bNote'),
    builderIreGrid: document.getElementById('builderIreGrid'),
    builderDeltaSummary: document.getElementById('builderDeltaSummary'),
    targetCsvPathLabel: document.getElementById('targetCsvPathLabel'),
    csvOutputPreview: document.getElementById('csvOutputPreview'),
    copyCsvRowBtn: document.getElementById('copyCsvRowBtn'),
  };

  // --- Utilities ---

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function linkifyNotes(text) {
    const escaped = escapeHtml(text);
    return escaped.replace(
      /(https?:\/\/[^\s<)]+)/g,
      (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );
  }

  // RFC 4180 CSV Parser
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          row.push(field);
          field = '';
        } else if (ch === '\r') {
          if (text[i + 1] === '\n') i++;
          row.push(field);
          rows.push(row);
          row = [];
          field = '';
        } else if (ch === '\n') {
          row.push(field);
          rows.push(row);
          row = [];
          field = '';
        } else {
          field += ch;
        }
      }
    }
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c.trim() !== ''));
  }

  function escapeCsvField(val) {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  function parseDateTimestamp(dateStr) {
    const s = (dateStr || '').trim();
    if (!s) return 0;
    if (/^\d{4}$/.test(s)) {
      return Date.UTC(Number(s), 0, 1);
    }
    const parts = s.split('/');
    if (parts.length === 3) {
      const m = Number(parts[0]) - 1;
      const d = Number(parts[1]);
      let y = Number(parts[2]);
      if (y < 100) y += 2000;
      const ts = Date.UTC(y, m, d);
      return Number.isNaN(ts) ? 0 : ts;
    }
    const parsed = Date.parse(s);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function extractFootnotes(str) {
    const s = (str || '').trim();
    const match = s.match(/(\*{1,4})\s*$/);
    if (!match) return { cleanText: s, starsCount: 0 };
    const count = match[1].length;
    return {
      cleanText: s.slice(0, match.index).trim(),
      starsCount: count,
    };
  }

  function normalizeIcFamily(rawIc) {
    const cleaned = (rawIc || '')
      .replace(/\*+/g, '')
      .replace(/\?+/g, '')
      .trim();
    if (!cleaned || /^(unknown|tbd|n\/a)$/i.test(cleaned)) return 'Unknown / TBD';
    const upper = cleaned.toUpperCase();
    if (upper.startsWith('AG6200')) return 'AG6200';
    if (upper.startsWith('AG6201')) return 'AG6201';
    if (upper.startsWith('ADV7215')) return 'ADV7215';
    if (upper.startsWith('ADV7125')) return 'ADV7125';
    if (upper.startsWith('CS5210')) return 'CS5210';
    if (upper.startsWith('CS5213')) return 'CS5213';
    if (upper.includes('7101')) return 'Chrontel CH7101';
    if (upper.includes('LONTIUM') || upper.startsWith('LT8612')) return 'Lontium LT8612';
    if (upper.includes('IT6892')) return 'ITE IT6892FN';
    if (upper.includes('IT6604')) return 'ITE IT6604E';
    if (upper.includes('IT6695')) return 'ITE IT6695FN';
    if (upper.includes('IT6902')) return 'ITE IT6902';
    if (upper.includes('RESISTOR LADDER')) return 'Resistor Ladder';
    return cleaned;
  }

  function formatNum(n) {
    if (n === null || n === undefined || Number.isNaN(n)) return '—';
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  }

  function formatSignedDelta(d) {
    if (d === null || d === undefined || Number.isNaN(d)) return '—';
    const rounded = Math.round(d * 10) / 10;
    const prefix = rounded > 0 ? '+' : '';
    return `${prefix}${formatNum(rounded)}`;
  }

  // --- Data Parsing ---

  function buildDataset(signalKey, csvText) {
    const cfg = SIGNAL_CONFIG[signalKey];
    const rows = parseCsv(csvText);
    if (rows.length === 0) {
      return { reference: cfg.defaultRef, refNote: cfg.refNote, items: [] };
    }

    const header = rows[0].map((h) => h.trim().toLowerCase());
    const idxMap = {
      name: header.findIndex((h) => h.startsWith('dac')),
      ic: header.findIndex((h) => h.startsWith('ic')),
      date: header.findIndex((h) => h.includes('date')),
      patGen: header.findIndex((h) => h.includes('pattern')),
      rating: header.findIndex((h) => h.includes('rating')),
      url: header.findIndex((h) => h.includes('url') || h.includes('link')),
      note: header.findIndex((h) => h.startsWith('note')),
    };

    const ireColIndices = IRE_STEPS.map((step, i) => {
      const exact = header.findIndex((h) => h === `${step} ire` || h === String(step));
      return exact !== -1 ? exact : 5 + i;
    });

    let reference = [...cfg.defaultRef];
    let refNote = cfg.refNote;
    const items = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const rawName = (row[idxMap.name] ?? '').trim();
      const rawRating = (row[idxMap.rating] ?? '').trim();

      if (
        rawName.toLowerCase().startsWith('reference mv') ||
        rawRating.toLowerCase() === 'reference'
      ) {
        const parsedRef = ireColIndices.map((ci, idx) => {
          const v = parseFloat((row[ci] ?? '').trim());
          return Number.isFinite(v) ? v : cfg.defaultRef[idx];
        });
        reference = parsedRef;
        const n = (idxMap.note !== -1 ? row[idxMap.note] : '')?.trim();
        if (n) refNote = n;
        continue;
      }

      if (!rawName) continue;

      const rawIc = (idxMap.ic !== -1 ? row[idxMap.ic] : '')?.trim() || '';
      const rawDate = (idxMap.date !== -1 ? row[idxMap.date] : '')?.trim() || '';
      const rawPatGen = (idxMap.patGen !== -1 ? row[idxMap.patGen] : '')?.trim() || '';
      const rawUrl = (idxMap.url !== -1 ? row[idxMap.url] : '')?.trim() || '';
      const rawNote = (idxMap.note !== -1 ? row[idxMap.note] : '')?.trim() || '';

      const starsMatch = rawRating.match(/\*/g);
      const stars = starsMatch ? Math.min(5, starsMatch.length) : 0;

      const ireValues = ireColIndices.map((ci) => {
        const cell = (row[ci] ?? '').trim();
        if (!cell || cell === '-') return null;
        const num = parseFloat(cell);
        return Number.isFinite(num) ? num : null;
      });

      const deltas = ireValues.map((v, idx) => (v === null ? null : v - reference[idx]));
      const validDeltas = deltas.filter((d) => d !== null).map((d) => Math.abs(d));
      const hasMeasurements = validDeltas.length > 0;
      const maxAbsError = hasMeasurements ? Math.max(...validDeltas) : null;

      const nameFn = extractFootnotes(rawName);
      const icFn = extractFootnotes(rawIc);
      const icFamily = normalizeIcFamily(rawIc);

      const id = `${signalKey}-${items.length + 1}`;
      const ratingMeta = RATING_META[stars];

      const searchBlob = [
        rawName,
        nameFn.cleanText,
        rawIc,
        icFamily,
        rawDate,
        rawPatGen,
        ratingMeta.label,
        `${stars} star`,
        SIGNAL_CONFIG[signalKey].label,
        rawUrl,
        rawNote,
      ]
        .join(' ')
        .toLowerCase();

      const item = {
        id,
        sheetOrder: items.length + 1,
        signal: signalKey,
        signalLabel: SIGNAL_CONFIG[signalKey].shortLabel,
        rawName,
        cleanName: nameFn.cleanText,
        nameFootnote: nameFn.starsCount,
        rawIc,
        cleanIc: icFn.cleanText,
        icFootnote: icFn.starsCount,
        icFamily,
        date: rawDate,
        dateTs: parseDateTimestamp(rawDate),
        patGen: rawPatGen,
        rawRating,
        stars,
        ireValues,
        reference,
        deltas,
        hasMeasurements,
        maxAbsError,
        url: rawUrl,
        note: rawNote,
        searchBlob,
      };

      items.push(item);
      state.allItemsById.set(id, item);
    }

    return { reference, refNote, items };
  }

  function parseSnesCurves(csvText) {
    const rows = parseCsv(csvText);
    for (let i = 1; i < rows.length; i++) {
      const label = (rows[i][0] || '').toLowerCase();
      const vals = rows[i].slice(1, 12).map((c) => parseFloat(c));
      if (vals.length === 11 && vals.every((n) => Number.isFinite(n))) {
        if (label.includes('snes')) state.snesCurves.snes = vals;
        if (label.includes('hcfr') || label.includes('mistercast')) state.snesCurves.hcfr = vals;
      }
    }
  }

  // --- Filtering & Sorting ---

  function matchesFilters(item, ignoreTab = false) {
    if (!ignoreTab && state.tab !== 'all' && item.signal !== state.tab) {
      return false;
    }
    if (state.hideIncomplete && !item.hasMeasurements) {
      return false;
    }
    if (state.rating !== 'all' && item.stars !== Number(state.rating)) {
      return false;
    }
    if (state.ic && item.icFamily !== state.ic) {
      return false;
    }
    if (state.query) {
      const tokens = state.query.toLowerCase().split(/\s+/).filter(Boolean);
      for (const tok of tokens) {
        if (!item.searchBlob.includes(tok)) return false;
      }
    }
    return true;
  }

  function getItemsForTab(tabKey) {
    if (tabKey === 'all') {
      return Object.keys(SIGNAL_CONFIG).flatMap((k) => state.datasets[k]?.items || []);
    }
    return state.datasets[tabKey]?.items || [];
  }

  function sortItems(items) {
    const [field, dir] = state.sort.split('-');
    const mul = dir === 'desc' ? -1 : 1;

    return [...items].sort((a, b) => {
      if (field === 'sheet') {
        if (a.signal !== b.signal) return a.signal.localeCompare(b.signal);
        return (a.sheetOrder - b.sheetOrder) * mul;
      }
      if (field === 'rating') {
        if (a.stars !== b.stars) return (a.stars - b.stars) * mul;
        const errA = a.maxAbsError ?? 9999;
        const errB = b.maxAbsError ?? 9999;
        return errA - errB;
      }
      if (field === 'maxerr') {
        if (a.maxAbsError === null && b.maxAbsError === null) return 0;
        if (a.maxAbsError === null) return 1;
        if (b.maxAbsError === null) return -1;
        return (a.maxAbsError - b.maxAbsError) * mul;
      }
      if (field === 'date') {
        if (a.dateTs !== b.dateTs) return (a.dateTs - b.dateTs) * mul;
        return a.sheetOrder - b.sheetOrder;
      }
      if (field === 'name') {
        return a.cleanName.localeCompare(b.cleanName) * mul;
      }
      if (field === 'ic') {
        return a.icFamily.localeCompare(b.icFamily) * mul;
      }
      if (field.startsWith('ire')) {
        const ireStep = Number(state.sort.split('-')[1]);
        const idx = IRE_STEPS.indexOf(ireStep);
        const dirSign = state.sort.endsWith('-desc') ? -1 : 1;
        const va = a.ireValues[idx];
        const vb = b.ireValues[idx];
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        return (va - vb) * dirSign;
      }
      return 0;
    });
  }

  // --- Rendering Table & Controls ---

  function populateIcDropdown() {
    const items = getItemsForTab(state.tab);
    const counts = new Map();
    for (const item of items) {
      counts.set(item.icFamily, (counts.get(item.icFamily) || 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    const currentVal = state.ic;
    els.icFilter.innerHTML = '<option value="">All ICs / Designs</option>';
    for (const [family, count] of sorted) {
      const opt = document.createElement('option');
      opt.value = family;
      opt.textContent = `${family} (${count})`;
      els.icFilter.appendChild(opt);
    }
    if (currentVal && counts.has(currentVal)) {
      els.icFilter.value = currentVal;
    } else {
      state.ic = '';
      els.icFilter.value = '';
    }
  }

  function renderTabCountsAndStats() {
    let totalAllMatches = 0;
    for (const key of Object.keys(SIGNAL_CONFIG)) {
      const ds = state.datasets[key];
      if (!ds) continue;
      const matches = ds.items.filter((it) => {
        // Count how many items in each tab match current query/rating/hideIncomplete
        if (state.hideIncomplete && !it.hasMeasurements) return false;
        if (state.rating !== 'all' && it.stars !== Number(state.rating)) return false;
        if (state.ic && it.icFamily !== state.ic) return false;
        if (state.query) {
          const tokens = state.query.toLowerCase().split(/\s+/).filter(Boolean);
          for (const tok of tokens) {
            if (!it.searchBlob.includes(tok)) return false;
          }
        }
        return true;
      });
      totalAllMatches += matches.length;
      const badge = document.getElementById(`count-${key}`);
      if (badge) badge.textContent = String(matches.length);
    }
    const allBadge = document.getElementById('count-all');
    if (allBadge) allBadge.textContent = String(totalAllMatches);

    const activeItems = getItemsForTab(state.tab);
    const refCount = activeItems.filter((i) => i.stars === 5).length;
    const greatCount = activeItems.filter((i) => i.stars === 4).length;
    els.summaryStats.innerHTML = `
      <span class="stat-chip"><strong>${refCount}</strong> 5★ Reference</span>
      <span class="stat-chip"><strong>${greatCount}</strong> 4★ Great</span>
      <span class="stat-chip"><strong>${activeItems.length}</strong> Total in View</span>
    `;
  }

  function renderReferenceHeaderRow() {
    const showSignalCol = state.tab === 'all';
    els.thSignal.classList.toggle('hidden', !showSignalCol);

    const ds = state.tab === 'all' ? state.datasets.rgb : state.datasets[state.tab];
    const ref = ds ? ds.reference : SIGNAL_CONFIG.rgb.defaultRef;
    const note =
      state.tab === 'all'
        ? 'RGB/YPbPr = 700 mV | S-Video/Composite = 714 mV'
        : ds?.refNote || '';

    const colspanMeta = showSignalCol ? 6 : 5;
    els.referenceRow.innerHTML = `
      <td></td>
      <td colspan="${colspanMeta}" style="text-align:left;">
        Reference mV at 10 IRE Increments
      </td>
      ${ref.map((v) => `<td class="col-ire">${formatNum(v)}</td>`).join('')}
      <td style="text-align:left; color: var(--text-muted); font-weight: 600;">${escapeHtml(note)}</td>
    `;
  }

  function renderFootnoteBadge(count) {
    if (!count) return '';
    const stars = '*'.repeat(count);
    const tip = FOOTNOTE_TOOLTIPS[count] || '';
    return `<span class="fn-tag" title="${escapeHtml(tip)}">${stars}</span>`;
  }

  function getHeatmapClass(absDelta) {
    if (!state.heatmap || absDelta === null) return '';
    if (absDelta <= 15) return 'hm-good';
    if (absDelta <= 25) return 'hm-ok';
    if (absDelta <= 35) return 'hm-warn';
    return 'hm-bad';
  }

  function getErrClass(absDelta) {
    if (absDelta === null) return '';
    if (absDelta <= 15) return 'err-good';
    if (absDelta <= 25) return 'err-ok';
    if (absDelta <= 35) return 'err-warn';
    return 'err-bad';
  }

  function renderSortIndicators() {
    const headers = els.tableHeaderRow.querySelectorAll('.sortable');
    headers.forEach((th) => {
      const existing = th.querySelector('.sort-indicator');
      if (existing) existing.remove();
      const key = th.dataset.sort;
      if (state.sort === `${key}-asc` || state.sort === `${key}-desc`) {
        const span = document.createElement('span');
        span.className = 'sort-indicator';
        span.textContent = state.sort.endsWith('-asc') ? '▲' : '▼';
        th.appendChild(span);
      }
    });
  }

  function renderTable() {
    renderReferenceHeaderRow();
    renderSortIndicators();

    const filtered = sortItems(getItemsForTab(state.tab).filter((it) => matchesFilters(it)));
    const totalInTab = getItemsForTab(state.tab).length;
    const showSignalCol = state.tab === 'all';

    els.resultsCountText.textContent =
      filtered.length === totalInTab
        ? `Showing all ${totalInTab} test entries`
        : `Showing ${filtered.length} of ${totalInTab} test entries`;

    const hasActiveFilter =
      state.query !== '' ||
      state.rating !== 'all' ||
      state.ic !== '' ||
      state.hideIncomplete;
    els.resetFiltersBtn.classList.toggle('hidden', !hasActiveFilter);
    els.clearSearchBtn.classList.toggle('hidden', state.query === '');

    if (filtered.length === 0) {
      const colSpan = showSignalCol ? 19 : 18;
      els.resultsTbody.innerHTML = `
        <tr>
          <td colspan="${colSpan}" style="text-align:center; padding: 32px 16px; color: var(--text-muted);">
            No DAC test results match your current filters. Try clearing the search or switching signal tabs.
          </td>
        </tr>
      `;
      return;
    }

    const htmlRows = filtered.map((item) => {
      const isPlotted = state.plottedIds.includes(item.id);
      const rMeta = RATING_META[item.stars];

      const nameHtml = item.url
        ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="dac-link">
             <span>${escapeHtml(item.cleanName)}</span>
             <svg class="ext-icon" viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8">
               <path d="M6 3H3v10h10v-3M9 2h5v5M14 2L7 9"/>
             </svg>
           </a>`
        : `<span>${escapeHtml(item.cleanName)}</span>`;

      const maxErrHtml =
        item.maxAbsError !== null
          ? `<span class="${getErrClass(item.maxAbsError)}">${formatNum(Math.round(item.maxAbsError * 10) / 10)} mV</span>`
          : `<span style="color:var(--text-dim)">—</span>`;

      const ireCellsHtml = item.ireValues
        .map((val, idx) => {
          if (val === null) {
            return `<td class="col-ire" style="color:var(--text-dim)">-</td>`;
          }
          const delta = item.deltas[idx];
          const absDelta = Math.abs(delta);
          const hmCls = idx === 0 && val === 0 ? '' : getHeatmapClass(absDelta);
          const tip = `${IRE_STEPS[idx]} IRE: ${val} mV (${formatSignedDelta(delta)} mV vs ${formatNum(item.reference[idx])} mV ref)`;
          const sub = state.showDeltas
            ? `<span class="ire-delta">${formatSignedDelta(delta)}</span>`
            : '';
          return `<td class="col-ire ${hmCls}" title="${escapeHtml(tip)}"><span class="ire-val">${formatNum(val)}</span>${sub}</td>`;
        })
        .join('');

      const signalCellHtml = showSignalCol
        ? `<td class="col-signal"><span class="signal-badge">${escapeHtml(item.signalLabel)}</span></td>`
        : '';

      return `
        <tr class="${isPlotted ? 'is-plotted' : ''}" data-id="${item.id}">
          <td class="col-chart">
            <button
              type="button"
              class="plot-btn ${isPlotted ? 'active' : ''}"
              data-plot-id="${item.id}"
              ${!item.hasMeasurements ? 'disabled title="No IRE voltage measurements recorded"' : `title="${isPlotted ? 'Remove from chart' : 'Compare on IRE chart'}"`}
            >${isPlotted ? '✓' : '+'}</button>
          </td>
          <td class="col-name">
            <div class="dac-name-cell">
              <div class="dac-name-main">
                ${nameHtml}
                ${renderFootnoteBadge(item.nameFootnote)}
              </div>
              <span class="patgen-sub">${escapeHtml(item.patGen)}</span>
            </div>
          </td>
          ${signalCellHtml}
          <td class="col-ic">
            ${escapeHtml(item.cleanIc || '—')}
            ${renderFootnoteBadge(item.icFootnote)}
          </td>
          <td class="col-date">${escapeHtml(item.date || '—')}</td>
          <td class="col-rating">
            <span class="grade-badge ${rMeta.cls}" title="${rMeta.stars} ${rMeta.label}">${rMeta.short}</span>
          </td>
          <td class="col-maxerr">${maxErrHtml}</td>
          ${ireCellsHtml}
          <td class="col-note">${linkifyNotes(item.note)}</td>
        </tr>
      `;
    });

    els.resultsTbody.innerHTML = htmlRows.join('');
  }

  // --- Interactive SVG IRE Chart ---

  function togglePlotItem(id) {
    const item = state.allItemsById.get(id);
    if (!item || !item.hasMeasurements) return;

    const existingIdx = state.plottedIds.indexOf(id);
    if (existingIdx !== -1) {
      state.plottedIds.splice(existingIdx, 1);
    } else {
      if (state.plottedIds.length >= SERIES_COLORS.length) {
        state.plottedIds.shift();
      }
      state.plottedIds.push(id);
    }
    renderChart();
    renderTable();
    syncUrlState();
  }

  function renderSelectedSeriesBar() {
    if (state.plottedIds.length === 0) {
      els.selectedSeriesBar.innerHTML = `
        <span style="font-size:0.78rem; color:var(--text-dim);">
          No DACs selected — showing Reference baseline${state.showSnesCurve ? ' & SNES 240p S-Curve' : ''}. Click <strong>+</strong> on any table row or pick a Preset!
        </span>
      `;
      return;
    }

    els.selectedSeriesBar.innerHTML = state.plottedIds
      .map((id, idx) => {
        const item = state.allItemsById.get(id);
        if (!item) return '';
        const color = SERIES_COLORS[idx % SERIES_COLORS.length];
        const suffix = state.tab === 'all' ? ` (${item.signalLabel})` : '';
        return `
          <span class="series-chip">
            <span class="series-swatch" style="background:${color}"></span>
            <span>${escapeHtml(item.cleanName + suffix)}</span>
            <button type="button" class="series-remove" data-remove-id="${id}" aria-label="Remove ${escapeHtml(item.cleanName)}">✕</button>
          </span>
        `;
      })
      .join('');
  }

  function getActiveReferenceArray() {
    if (state.plottedIds.length > 0) {
      const firstItem = state.allItemsById.get(state.plottedIds[0]);
      if (firstItem) return firstItem.reference;
    }
    if (state.tab !== 'all' && state.datasets[state.tab]) {
      return state.datasets[state.tab].reference;
    }
    return SIGNAL_CONFIG.rgb.defaultRef;
  }

  function renderChart() {
    renderSelectedSeriesBar();
    if (state.chartCollapsed) return;

    const svg = els.ireChartSvg;
    const rect = els.chartStage.getBoundingClientRect();
    const width = Math.max(320, rect.width || 900);
    const height = Math.max(220, rect.height || 280);

    const pad = { top: 18, right: 24, bottom: 34, left: 52 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const refArray = getActiveReferenceArray();
    const isDelta = state.chartMode === 'delta';

    // Gather series to plot
    const seriesList = state.plottedIds
      .map((id, idx) => {
        const item = state.allItemsById.get(id);
        if (!item) return null;
        return {
          id: item.id,
          name: item.cleanName + (state.tab === 'all' ? ` [${item.signalLabel}]` : ''),
          color: SERIES_COLORS[idx % SERIES_COLORS.length],
          values: isDelta ? item.deltas : item.ireValues,
          rawMv: item.ireValues,
          deltas: item.deltas,
        };
      })
      .filter(Boolean);

    // Optional SNES S-Curve reference series (calibrated at 700 mV RGB scale)
    const snesVals = state.snesCurves.snes;
    let snesPlotValues = null;
    if (state.showSnesCurve && snesVals) {
      snesPlotValues = isDelta
        ? snesVals.map((v, i) => v - SIGNAL_CONFIG.rgb.defaultRef[i])
        : snesVals;
    }

    // Compute Y domain
    let yMin = isDelta ? -35 : 0;
    let yMax = isDelta ? 35 : 750;

    if (isDelta) {
      const allNums = [
        ...seriesList.flatMap((s) => s.values.filter((v) => v !== null)),
        ...(snesPlotValues || []),
      ];
      for (const v of allNums) {
        if (v < yMin) yMin = Math.floor((v - 6) / 10) * 10;
        if (v > yMax) yMax = Math.ceil((v + 6) / 10) * 10;
      }
    } else {
      const allNums = [
        ...refArray,
        ...seriesList.flatMap((s) => s.values.filter((v) => v !== null)),
        ...(snesPlotValues || []),
      ];
      for (const v of allNums) {
        if (v > yMax) yMax = Math.ceil((v + 20) / 50) * 50;
      }
    }

    const xScale = (ireIdx) => pad.left + (ireIdx / 10) * plotW;
    const yScale = (val) => pad.top + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

    // Y grid ticks
    const yTicks = [];
    const stepSize = isDelta
      ? yMax - yMin > 110
        ? 25
        : 15
      : 100;
    const firstTick = Math.ceil(yMin / stepSize) * stepSize;
    for (let t = firstTick; t <= yMax; t += stepSize) {
      yTicks.push(t);
    }
    if (isDelta && !yTicks.includes(0)) yTicks.push(0);

    let parts = [];
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Tolerance bands in Delta mode (±15 mV Reference band)
    if (isDelta) {
      const yTop15 = yScale(Math.min(yMax, 15));
      const yBot15 = yScale(Math.max(yMin, -15));
      parts.push(
        `<rect x="${pad.left}" y="${yTop15}" width="${plotW}" height="${Math.max(0, yBot15 - yTop15)}" fill="rgba(34, 197, 94, 0.08)" />`
      );
      if (25 <= yMax) {
        parts.push(
          `<line x1="${pad.left}" y1="${yScale(25)}" x2="${pad.left + plotW}" y2="${yScale(25)}" stroke="rgba(250,204,21,0.28)" stroke-dasharray="3 3" stroke-width="1"/>`
        );
      }
      if (-25 >= yMin) {
        parts.push(
          `<line x1="${pad.left}" y1="${yScale(-25)}" x2="${pad.left + plotW}" y2="${yScale(-25)}" stroke="rgba(250,204,21,0.28)" stroke-dasharray="3 3" stroke-width="1"/>`
        );
      }
    }

    // Grid lines & axes labels
    for (const t of yTicks) {
      const y = yScale(t);
      const isZero = isDelta && t === 0;
      parts.push(
        `<line x1="${pad.left}" y1="${y}" x2="${pad.left + plotW}" y2="${y}" stroke="${isZero ? 'var(--ref-line)' : 'var(--border)'}" stroke-width="${isZero ? '1.5' : '1'}" ${isZero ? 'stroke-dasharray="5 4"' : ''}/>`,
        `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" fill="var(--text-dim)" font-size="11">${isDelta && t > 0 ? `+${t}` : t} mV</text>`
      );
    }

    IRE_STEPS.forEach((ire, idx) => {
      const x = xScale(idx);
      parts.push(
        `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${pad.top + plotH}" stroke="var(--border)" stroke-opacity="0.55" stroke-width="1"/>`,
        `<text x="${x}" y="${height - 10}" text-anchor="middle" fill="var(--text-dim)" font-size="11">${ire}${idx === 10 || idx === 0 ? ' IRE' : ''}</text>`
      );
    });

    // Reference Line in Absolute mode
    if (!isDelta) {
      const refPoints = refArray.map((v, idx) => `${xScale(idx)},${yScale(v)}`).join(' ');
      parts.push(
        `<polyline points="${refPoints}" fill="none" stroke="var(--ref-line)" stroke-width="1.8" stroke-dasharray="5 4" />`
      );
    }

    // SNES S-Curve overlay
    if (snesPlotValues) {
      const snesPoints = snesPlotValues.map((v, idx) => `${xScale(idx)},${yScale(v)}`).join(' ');
      parts.push(
        `<polyline points="${snesPoints}" fill="none" stroke="var(--snes-line)" stroke-width="1.8" stroke-dasharray="3 3" opacity="0.85" />`
      );
    }

    // Plotted DAC series
    for (const s of seriesList) {
      let pathCmd = '';
      s.values.forEach((v, idx) => {
        if (v === null) return;
        const x = xScale(idx);
        const y = yScale(v);
        pathCmd += pathCmd === '' ? `M ${x} ${y}` : ` L ${x} ${y}`;
      });
      if (pathCmd) {
        parts.push(
          `<path d="${pathCmd}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />`
        );
      }
      s.values.forEach((v, idx) => {
        if (v === null) return;
        const isHovered = state.hoveredIreIdx === idx;
        parts.push(
          `<circle cx="${xScale(idx)}" cy="${yScale(v)}" r="${isHovered ? 5 : 3.2}" fill="${s.color}" stroke="var(--bg-elevated)" stroke-width="1.3" />`
        );
      });
    }

    // Hover vertical guide
    if (state.hoveredIreIdx !== null) {
      const hx = xScale(state.hoveredIreIdx);
      parts.push(
        `<line x1="${hx}" y1="${pad.top}" x2="${hx}" y2="${pad.top + plotH}" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="2 2" />`
      );
    }

    // Legend badge in top-right of plot
    if (isDelta) {
      parts.push(
        `<text x="${pad.left + 8}" y="${pad.top + 13}" fill="var(--star-5-fg)" font-size="10.5" font-weight="600">±15 mV Reference Band (5★)</text>`
      );
    }

    svg.innerHTML = parts.join('');
    svg._chartGeom = { pad, plotW, plotH, width, height, refArray, seriesList, snesPlotValues };
  }

  function handleChartPointerMove(evt) {
    const geom = els.ireChartSvg._chartGeom;
    if (!geom) return;
    const stageRect = els.chartStage.getBoundingClientRect();
    const relX = evt.clientX - stageRect.left;
    const relY = evt.clientY - stageRect.top;

    if (relX < geom.pad.left - 12 || relX > geom.pad.left + geom.plotW + 12) {
      hideChartTooltip();
      return;
    }

    const ratio = (relX - geom.pad.left) / geom.plotW;
    const idx = Math.max(0, Math.min(10, Math.round(ratio * 10)));

    if (state.hoveredIreIdx !== idx) {
      state.hoveredIreIdx = idx;
      renderChart();
    }

    const ire = IRE_STEPS[idx];
    const refMv = geom.refArray[idx];

    let rowsHtml = `
      <div class="tt-row" style="color:var(--text-muted)">
        <span class="tt-label">Reference Target</span>
        <strong>${formatNum(refMv)} mV</strong>
      </div>
    `;

    if (state.showSnesCurve && state.snesCurves.snes) {
      const sv = state.snesCurves.snes[idx];
      const sd = sv - SIGNAL_CONFIG.rgb.defaultRef[idx];
      rowsHtml += `
        <div class="tt-row" style="color:var(--snes-line)">
          <span class="tt-label">SNES S-Curve</span>
          <span>${sv} mV (${formatSignedDelta(sd)})</span>
        </div>
      `;
    }

    for (const s of geom.seriesList) {
      const mv = s.rawMv[idx];
      const d = s.deltas[idx];
      rowsHtml += `
        <div class="tt-row">
          <span class="tt-label">
            <span class="series-swatch" style="background:${s.color}"></span>
            <span>${escapeHtml(s.name)}</span>
          </span>
          <strong>${mv === null ? '—' : `${formatNum(mv)} mV (${formatSignedDelta(d)})`}</strong>
        </div>
      `;
    }

    els.chartTooltip.innerHTML = `
      <div class="tt-title">
        <span>${ire} IRE</span>
        <span style="color:var(--text-dim); font-weight:500;">Δ vs Ref</span>
      </div>
      ${rowsHtml}
    `;
    els.chartTooltip.classList.remove('hidden');

    const ttWidth = els.chartTooltip.offsetWidth || 215;
    const leftPos =
      relX + 16 + ttWidth > stageRect.width
        ? Math.max(8, relX - ttWidth - 14)
        : relX + 14;
    const topPos = Math.max(8, Math.min(stageRect.height - (els.chartTooltip.offsetHeight || 90) - 8, relY - 18));

    els.chartTooltip.style.left = `${leftPos}px`;
    els.chartTooltip.style.top = `${topPos}px`;
  }

  function hideChartTooltip() {
    if (state.hoveredIreIdx !== null) {
      state.hoveredIreIdx = null;
      renderChart();
    }
    els.chartTooltip.classList.add('hidden');
  }

  // --- Presets ---

  function findItemBySubstring(signalKey, nameSub, patSub = '') {
    const items = state.datasets[signalKey]?.items || [];
    return items.find(
      (it) =>
        it.cleanName.toLowerCase().includes(nameSub.toLowerCase()) &&
        (!patSub || it.patGen.toLowerCase().includes(patSub.toLowerCase())) &&
        it.hasMeasurements
    );
  }

  function applyChartPreset(presetKey) {
    if (!presetKey) return;
    let picks = [];

    if (presetKey === 'top-ref') {
      state.tab = 'rgb';
      picks = [
        findItemBySubstring('rgb', 'HDFury x3', '240p'),
        findItemBySubstring('rgb', 'RetroCastle 2024-DUAL SDRAM VGA'),
        findItemBySubstring('rgb', 'Reflex Prisim - VGA'),
        findItemBySubstring('rgb', 'SuperStation One'),
      ];
    } else if (presetKey === 'ref-vs-ag6200') {
      state.tab = 'rgb';
      picks = [
        findItemBySubstring('rgb', 'RetroCastle 2024-DUAL SDRAM VGA'),
        findItemBySubstring('rgb', 'Reflex Prisim - VGA'),
        findItemBySubstring('rgb', 'goFanco'),
        findItemBySubstring('rgb', 'Cableleader A'),
      ];
    } else if (presetKey === 'io-boards') {
      state.tab = 'rgb';
      picks = [
        findItemBySubstring('rgb', 'IO ANALOG PRO v1'),
        findItemBySubstring('rgb', 'Analog I/O Pro v2'),
        findItemBySubstring('rgb', '9.2 Combo'),
        findItemBySubstring('rgb', 'Mister Addons Analog I/O Board - Ref 6.1'),
        findItemBySubstring('rgb', 'Mister Multisystem - Ref 6.1'),
      ];
    } else if (presetKey === 'snes-vs-hcfr') {
      state.tab = 'rgb';
      state.showSnesCurve = true;
      els.showSnesCurveToggle.checked = true;
      picks = [
        findItemBySubstring('rgb', 'HDFury x3', '240p'),
        findItemBySubstring('rgb', 'HDFury x3', 'mistercast'),
      ];
    }

    state.plottedIds = picks.filter(Boolean).map((it) => it.id);
    syncTabButtons();
    populateIcDropdown();
    renderTabCountsAndStats();
    renderChart();
    renderTable();
    syncUrlState();
  }

  // --- URL State Synchronization ---

  function loadUrlState() {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && (SIGNAL_CONFIG[tab] || tab === 'all')) state.tab = tab;
    if (params.has('q')) state.query = params.get('q') || '';
    if (params.has('rating')) state.rating = params.get('rating') || 'all';
    if (params.has('ic')) state.ic = params.get('ic') || '';
    if (params.has('sort')) state.sort = params.get('sort') || 'sheet-asc';
    if (params.get('mode') === 'absolute') state.chartMode = 'absolute';
    if (params.get('measured') === '1') state.hideIncomplete = true;

    const plotParam = params.get('plot');
    if (plotParam) {
      state.plottedIds = plotParam
        .split(',')
        .filter((id) => state.allItemsById.has(id))
        .slice(0, SERIES_COLORS.length);
    }
  }

  function syncUrlState() {
    const params = new URLSearchParams();
    if (state.tab !== 'rgb') params.set('tab', state.tab);
    if (state.query) params.set('q', state.query);
    if (state.rating !== 'all') params.set('rating', state.rating);
    if (state.ic) params.set('ic', state.ic);
    if (state.sort !== 'sheet-asc') params.set('sort', state.sort);
    if (state.chartMode !== 'delta') params.set('mode', state.chartMode);
    if (state.hideIncomplete) params.set('measured', '1');
    if (state.plottedIds.length > 0) params.set('plot', state.plottedIds.join(','));

    const qs = params.toString();
    const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  }

  function syncTabButtons() {
    els.signalTabs.querySelectorAll('.signal-tab').forEach((btn) => {
      const active = btn.dataset.tab === state.tab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });
  }

  function syncControlsFromState() {
    syncTabButtons();
    els.searchInput.value = state.query;
    els.sortSelect.value = state.sort;
    els.hideIncompleteToggle.checked = state.hideIncomplete;
    els.heatmapToggle.checked = state.heatmap;
    els.deltaSubtextToggle.checked = state.showDeltas;
    els.showSnesCurveToggle.checked = state.showSnesCurve;

    els.ratingPills.querySelectorAll('.pill').forEach((p) => {
      p.classList.toggle('active', p.dataset.rating === state.rating);
    });

    document.querySelectorAll('[data-chart-mode]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.chartMode === state.chartMode);
    });
  }

  // --- CSV Export ---

  function exportFilteredCsv() {
    const items = sortItems(getItemsForTab(state.tab).filter((it) => matchesFilters(it)));
    const headers = [
      ...(state.tab === 'all' ? ['Signal'] : []),
      'DAC or IO Board',
      'IC/Resistor Ladder',
      'Test Date',
      'Pattern Generator',
      'Rating',
      ...IRE_STEPS.map((s) => `${s} IRE`),
      'Product URL',
      'Note',
    ];

    const rows = [headers];
    for (const it of items) {
      rows.push([
        ...(state.tab === 'all' ? [it.signalLabel] : []),
        it.rawName,
        it.rawIc,
        it.date,
        it.patGen,
        it.rawRating,
        ...it.ireValues.map((v) => (v === null ? '-' : String(v))),
        it.url,
        it.note,
      ]);
    }

    const csvContent = rows.map((r) => r.map(escapeCsvField).join(',')).join('\n') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `dac-results-${state.tab}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // --- CSV Row Builder Modal ---

  function initCsvBuilderModal() {
    const today = new Date();
    els.bDate.value = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;

    els.builderIreGrid.innerHTML = IRE_STEPS.map(
      (ire, idx) => `
      <div class="ire-mini-field">
        <span>${ire} IRE</span>
        <input type="text" data-ire-input="${idx}" value="${idx === 0 ? '0' : ''}" placeholder="-" />
        <span class="ire-mini-delta" id="bDelta-${idx}"></span>
      </div>
    `
    ).join('');

    updateCsvBuilderPreview();
  }

  function updateCsvBuilderPreview() {
    const sig = els.bSignal.value;
    els.targetCsvPathLabel.textContent = `data/${sig}.csv`;
    const ref = SIGNAL_CONFIG[sig].defaultRef;

    const inputs = [...els.builderIreGrid.querySelectorAll('[data-ire-input]')];
    const ireCells = [];
    const absDeltas = [];

    inputs.forEach((inp, idx) => {
      const raw = inp.value.trim();
      const deltaEl = document.getElementById(`bDelta-${idx}`);
      if (!raw || raw === '-') {
        ireCells.push('-');
        if (deltaEl) deltaEl.textContent = '';
      } else {
        ireCells.push(raw);
        const num = parseFloat(raw);
        if (Number.isFinite(num)) {
          const d = num - ref[idx];
          absDeltas.push(Math.abs(d));
          if (deltaEl) {
            deltaEl.textContent = formatSignedDelta(d);
            deltaEl.className = `ire-mini-delta ${getErrClass(Math.abs(d))}`;
          }
        }
      }
    });

    if (absDeltas.length > 0) {
      const maxErr = Math.max(...absDeltas);
      const over15 = absDeltas.filter((d) => d > 15).length;
      const over25 = absDeltas.filter((d) => d > 25).length;
      const over35 = absDeltas.filter((d) => d > 35).length;
      let hint = '1★–2★ (Large Deviations)';
      if (over15 <= 1) hint = '5★ Reference Range (check RGB separation)';
      else if (over25 <= 1) hint = '4★ Great Range';
      else if (over35 === 0) hint = '3★ Good Range';

      els.builderDeltaSummary.textContent = `Max |Δ|: ${formatNum(Math.round(maxErr * 10) / 10)} mV — ${hint}`;
    } else {
      els.builderDeltaSummary.textContent = '';
    }

    const rowFields = [
      els.bName.value.trim(),
      els.bIc.value.trim(),
      els.bDate.value.trim(),
      els.bPatGen.value.trim(),
      els.bRating.value,
      ...ireCells,
      els.bUrl.value.trim(),
      els.bNote.value.replace(/\r?\n/g, ' ').trim(),
    ];

    els.csvOutputPreview.value = rowFields.map(escapeCsvField).join(',');
  }

  // --- Event Listeners ---

  function bindEvents() {
    // Theme toggle
    const savedTheme = localStorage.getItem('dac-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
    els.themeToggleBtn.addEventListener('click', () => {
      const curr = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = curr === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('dac-theme', next);
      renderChart();
    });

    // Keyboard `/` to focus search
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        els.searchInput.focus();
      }
      if (e.key === 'Escape' && !els.csvModalBackdrop.classList.contains('hidden')) {
        els.csvModalBackdrop.classList.add('hidden');
      }
    });

    // Signal Tabs
    els.signalTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.signal-tab');
      if (!btn) return;
      state.tab = btn.dataset.tab;
      syncTabButtons();
      populateIcDropdown();
      renderTabCountsAndStats();
      renderChart();
      renderTable();
      syncUrlState();
    });

    // Search Input
    els.searchInput.addEventListener('input', () => {
      state.query = els.searchInput.value.trim();
      renderTabCountsAndStats();
      renderTable();
      syncUrlState();
    });

    els.clearSearchBtn.addEventListener('click', () => {
      state.query = '';
      els.searchInput.value = '';
      renderTabCountsAndStats();
      renderTable();
      syncUrlState();
      els.searchInput.focus();
    });

    // IC Filter & Sort Select
    els.icFilter.addEventListener('change', () => {
      state.ic = els.icFilter.value;
      renderTabCountsAndStats();
      renderTable();
      syncUrlState();
    });

    els.sortSelect.addEventListener('change', () => {
      state.sort = els.sortSelect.value;
      renderTable();
      syncUrlState();
    });

    // Rating Pills
    els.ratingPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill');
      if (!pill) return;
      state.rating = pill.dataset.rating;
      els.ratingPills.querySelectorAll('.pill').forEach((p) => {
        p.classList.toggle('active', p === pill);
      });
      renderTabCountsAndStats();
      renderTable();
      syncUrlState();
    });

    // View Toggles
    els.hideIncompleteToggle.addEventListener('change', () => {
      state.hideIncomplete = els.hideIncompleteToggle.checked;
      renderTabCountsAndStats();
      renderTable();
      syncUrlState();
    });

    els.heatmapToggle.addEventListener('change', () => {
      state.heatmap = els.heatmapToggle.checked;
      renderTable();
    });

    els.deltaSubtextToggle.addEventListener('change', () => {
      state.showDeltas = els.deltaSubtextToggle.checked;
      renderTable();
    });

    els.resetFiltersBtn.addEventListener('click', () => {
      state.query = '';
      state.rating = 'all';
      state.ic = '';
      state.hideIncomplete = false;
      syncControlsFromState();
      populateIcDropdown();
      renderTabCountsAndStats();
      renderTable();
      syncUrlState();
    });

    // Sortable Column Headers
    els.tableHeaderRow.addEventListener('click', (e) => {
      const th = e.target.closest('.sortable');
      if (!th) return;
      const key = th.dataset.sort;
      const defaultDir = key === 'rating' || key === 'date' ? 'desc' : 'asc';
      if (state.sort === `${key}-${defaultDir}`) {
        state.sort = `${key}-${defaultDir === 'asc' ? 'desc' : 'asc'}`;
      } else {
        state.sort = `${key}-${defaultDir}`;
      }
      if ([...els.sortSelect.options].some((o) => o.value === state.sort)) {
        els.sortSelect.value = state.sort;
      }
      renderTable();
      syncUrlState();
    });

    // Plot Row Buttons
    els.resultsTbody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-plot-id]');
      if (!btn) return;
      togglePlotItem(btn.dataset.plotId);
    });

    // Remove Series Chip
    els.selectedSeriesBar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-id]');
      if (!btn) return;
      togglePlotItem(btn.dataset.removeId);
    });

    // Chart Controls
    els.collapseChartBtn.addEventListener('click', () => {
      state.chartCollapsed = !state.chartCollapsed;
      els.collapseChartBtn.setAttribute('aria-expanded', String(!state.chartCollapsed));
      els.chartBody.classList.toggle('hidden', state.chartCollapsed);
      if (!state.chartCollapsed) renderChart();
    });

    document.querySelectorAll('[data-chart-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.chartMode = btn.dataset.chartMode;
        document.querySelectorAll('[data-chart-mode]').forEach((b) => {
          b.classList.toggle('active', b === btn);
        });
        renderChart();
        syncUrlState();
      });
    });

    els.showSnesCurveToggle.addEventListener('change', () => {
      state.showSnesCurve = els.showSnesCurveToggle.checked;
      renderChart();
    });

    els.chartPresetSelect.addEventListener('change', () => {
      applyChartPreset(els.chartPresetSelect.value);
      els.chartPresetSelect.value = '';
    });

    els.clearChartBtn.addEventListener('click', () => {
      state.plottedIds = [];
      renderChart();
      renderTable();
      syncUrlState();
    });

    els.chartStage.addEventListener('mousemove', handleChartPointerMove);
    els.chartStage.addEventListener('mouseleave', hideChartTooltip);
    window.addEventListener('resize', () => renderChart());

    // Copy Link & Export CSV
    els.copyShareLinkBtn.addEventListener('click', async () => {
      syncUrlState();
      try {
        await navigator.clipboard.writeText(window.location.href);
        const orig = els.copyShareLinkBtn.textContent;
        els.copyShareLinkBtn.textContent = 'Copied URL!';
        setTimeout(() => {
          els.copyShareLinkBtn.textContent = orig;
        }, 1600);
      } catch {}
    });

    els.exportCsvBtn.addEventListener('click', exportFilteredCsv);

    // CSV Row Helper Modal
    els.openCsvBuilderBtn.addEventListener('click', () => {
      if (SIGNAL_CONFIG[state.tab]) {
        els.bSignal.value = state.tab;
      }
      updateCsvBuilderPreview();
      els.csvModalBackdrop.classList.remove('hidden');
      els.bName.focus();
    });

    els.closeCsvModalBtn.addEventListener('click', () => {
      els.csvModalBackdrop.classList.add('hidden');
    });

    els.csvModalBackdrop.addEventListener('click', (e) => {
      if (e.target === els.csvModalBackdrop) {
        els.csvModalBackdrop.classList.add('hidden');
      }
    });

    els.csvBuilderForm.addEventListener('input', updateCsvBuilderPreview);
    els.csvBuilderForm.addEventListener('change', updateCsvBuilderPreview);

    els.copyCsvRowBtn.addEventListener('click', async () => {
      updateCsvBuilderPreview();
      try {
        await navigator.clipboard.writeText(els.csvOutputPreview.value);
        const orig = els.copyCsvRowBtn.textContent;
        els.copyCsvRowBtn.textContent = 'Copied!';
        setTimeout(() => {
          els.copyCsvRowBtn.textContent = orig;
        }, 1500);
      } catch {
        els.csvOutputPreview.select();
      }
    });
  }

  // --- Bootstrap ---

  async function init() {
    bindEvents();
    initCsvBuilderModal();

    try {
      const cb = `?t=${Date.now()}`;
      const [rgbTxt, compTxt, svidTxt, cvbsTxt, snesTxt] = await Promise.all([
        fetch(`${SIGNAL_CONFIG.rgb.csvPath}${cb}`, { cache: 'no-store' }).then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status} loading ${SIGNAL_CONFIG.rgb.csvPath}`);
          return r.text();
        }),
        fetch(`${SIGNAL_CONFIG.component.csvPath}${cb}`, { cache: 'no-store' }).then((r) => r.text()),
        fetch(`${SIGNAL_CONFIG.svideo.csvPath}${cb}`, { cache: 'no-store' }).then((r) => r.text()),
        fetch(`${SIGNAL_CONFIG.composite.csvPath}${cb}`, { cache: 'no-store' }).then((r) => r.text()),
        fetch(`./data/snes-s-curve.csv${cb}`, { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')),
      ]);

      state.datasets.rgb = buildDataset('rgb', rgbTxt);
      state.datasets.component = buildDataset('component', compTxt);
      state.datasets.svideo = buildDataset('svideo', svidTxt);
      state.datasets.composite = buildDataset('composite', cvbsTxt);
      if (snesTxt) parseSnesCurves(snesTxt);

      loadUrlState();

      syncControlsFromState();
      populateIcDropdown();
      renderTabCountsAndStats();
      renderTable();
      renderChart();
    } catch (err) {
      els.errorBanner.classList.remove('hidden');
      const isFileProtocol = window.location.protocol === 'file:';
      els.errorBanner.innerHTML = isFileProtocol
        ? `<strong>Opened directly via <code>file://</code>:</strong> Browsers block reading local CSV files over <code>file://</code>. Once pushed to <strong>GitHub Pages</strong>, this works automatically! To preview locally, run <code>npx serve .</code> in this folder.`
        : `<strong>Failed to load CSV data:</strong> ${escapeHtml(err.message)}`;
      els.resultsCountText.textContent = 'Unable to load CSV files';
    }
  }

  init();
})();
