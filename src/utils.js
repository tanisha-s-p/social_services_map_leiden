// ── Category colours (from ai_feature — the working, colourful version) ──────
export const CATEGORY_COLORS = {
  'Onkosten en dagelijks leven': '#e78f32',
  'Gezondheid en zorg':          '#499fd2',
  'Wonen en energie besparen':   '#92c937',
  'Kinderen en opgroeien':       '#e5574c',
  'Studeren en werken':          '#df84c0',
  'Hulp bij schulden':           '#7a49a3',
};

export const CATEGORIES = Object.keys(CATEGORY_COLORS);

export const ACCESS_LABELS = {
  walkin:        'Inloop',
  appointment:   'Op afspraak',
  home_visit:    'Thuisbezoek',
  online:        'Online',
  phone:         'Telefonisch',
  referral_only: 'Via verwijzing',
};

export const LOC_TYPE_COLORS = {
  government:   '#396933',
  organization: '#385EFF',
  hub:          '#d4a000',
  library:      '#555555',
};

export const LOC_TYPE_LABELS = {
  government:   'Gemeente',
  organization: 'Organisatie',
  hub:          'Wijkhub',
  library:      'Bibliotheek',
};

// ── Parsers ───────────────────────────────────────────────────────────────────

export function parseCategories(raw) {
  if (!raw) return [];
  return raw
      .split(',')
      .map((c) => c.trim())
      .filter((c) => CATEGORIES.includes(c));
}

export function parseKeywords(raw) {
  if (!raw) return [];
  return raw.split(/[,;]/).map((k) => k.trim()).filter(Boolean);
}

export function parseAccessType(raw) {
  if (!raw) return '';
  const types = ['walkin', 'appointment', 'home_visit', 'online', 'phone', 'referral_only'];
  const parts  = raw.split(/[,\s]+/).map((p) => p.trim());
  return parts.find((p) => types.includes(p)) || parts[0] || '';
}

// ── filterServices (used by Chatbot for local pre-filtering) ─────────────────

export function filterServices(services, answers) {
  const {
    selected_categories = [],
    age                  = '',
    household_type       = [],
    selected_keywords    = [],
  } = answers;

  let results = [...services];

  // 1. Category filter
  if (selected_categories.length > 0) {
    results = results.filter((s) => {
      const cats = s._categories || [];
      return cats.some((c) => selected_categories.includes(c));
    });
  }

  // 2. Age filter
  if (age && age !== 'Wil ik niet zeggen') {
    let ageNum = null;
    if (age === 'Onder 18') ageNum = 12;
    else if (age === '18–26') ageNum = 22;
    else if (age === '27–65') ageNum = 45;
    else if (age === '65+')   ageNum = 70;

    if (ageNum !== null) {
      results = results.filter((s) => {
        const min = s._age_min ?? 0;
        const max = s._age_max ?? 99;
        return ageNum >= min && ageNum <= max;
      });
    }
  }

  // 3. Household (soft — no household_tags column in real data)
  // eslint-disable-next-line no-unused-vars
  const _filteredHousehold = household_type.filter((h) => h !== 'Wil ik niet zeggen');

  // 4. Keyword / description filter
  if (selected_keywords.length > 0) {
    results = results.filter((s) => {
      const kws      = s._keywords || [];
      const haystack = `${s.name} ${s.description} ${s.target_group}`.toLowerCase();
      return selected_keywords.some(
          (k) =>
              kws.some((kw) => kw.toLowerCase().includes(k.toLowerCase())) ||
              haystack.includes(k.toLowerCase()),
      );
    });
  }

  // 5. Fallback — return hub services
  if (results.length === 0) {
    return services.filter((s) => s._loc_type === 'hub').slice(0, 3);
  }

  return results.slice(0, 3);
}

// ── Colour helper ─────────────────────────────────────────────────────────────

export function getCategoryColor(cats) {
  if (!cats || cats.length === 0) return '#9e9890';
  for (const c of cats) {
    if (CATEGORY_COLORS[c]) return CATEGORY_COLORS[c];
  }
  return '#9e9890';
}
