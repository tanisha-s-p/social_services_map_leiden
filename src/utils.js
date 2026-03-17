export const CATEGORY_COLORS = {
  'Onkosten en dagelijks leven': '#e78f32',
  'Gezondheid en zorg': '#499fd2',
  'Wonen en energie besparen': '#92c937',
  'Kinderen en opgroeien': '#e5574c',
  'Studeren en werken': '#df84c0',
  'Hulp bij schulden': '#7a49a3',
};

export const CATEGORIES = Object.keys(CATEGORY_COLORS);

export const ACCESS_LABELS = {
  walkin: 'Inloop',
  appointment: 'Op afspraak',
  home_visit: 'Thuisbezoek',
  online: 'Online',
  phone: 'Telefonisch',
  referral_only: 'Via verwijzing',
};

export const LOC_TYPE_COLORS = {
  government: '#396933',
  organization: '#385EFF',
  hub: '#d4a000',
  library: '#555555',
};

export const LOC_TYPE_LABELS = {
  government: 'Gemeente',
  organization: 'Organisatie',
  hub: 'Wijkhub',
  library: 'Bibliotheek',
};

/**
 * Parse a raw category string (possibly comma-separated, possibly single)
 * into an array of known categories.
 */
export function parseCategories(raw) {
  if (!raw) return [];
  return raw
      .split(',')
      .map((c) => c.trim())
      .filter((c) => CATEGORIES.includes(c));
}

/**
 * Parse keywords / tags from a CSV cell (comma or semicolon separated).
 */
export function parseKeywords(raw) {
  if (!raw) return [];
  return raw.split(/[,;]/).map((k) => k.trim()).filter(Boolean);
}

/**
 * Parse access_type — may be comma-separated list, return first canonical value.
 */
export function parseAccessType(raw) {
  if (!raw) return '';
  const types = ['walkin', 'appointment', 'home_visit', 'online', 'phone', 'referral_only'];
  const parts = raw.split(/[,\s]+/).map((p) => p.trim());
  return parts.find((p) => types.includes(p)) || parts[0] || '';
}

/**
 * filterServices — takes the merged service+location objects and session answers.
 * Returns best 3 matches, or top 3 hubs as fallback.
 */
export function filterServices(services, answers) {
  const {
    selected_categories = [],
    age = '',
    household_type = [],
    selected_keywords = [],
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
    else if (age === '65+') ageNum = 70;

    if (ageNum !== null) {
      results = results.filter((s) => {
        const min = s._age_min ?? 0;
        const max = s._age_max ?? 99;
        return ageNum >= min && ageNum <= max;
      });
    }
  }

  // 3. Household filter (ignore "wil ik niet zeggen")
  const filteredHousehold = household_type.filter((h) => h !== 'Wil ik niet zeggen');
  if (filteredHousehold.length > 0) {
    // We don't have household_tags in the real data, so skip hard filtering
    // but we can use target_group text matching as a soft signal
    // Don't hard-filter — real data has no household_tags column
  }

  // 4. Keyword / search filter
  if (selected_keywords.length > 0) {
    results = results.filter((s) => {
      const kws = s._keywords || [];
      const haystack = `${s.name} ${s.description} ${s.target_group}`.toLowerCase();
      return selected_keywords.some(
          (k) => kws.some((kw) => kw.toLowerCase().includes(k.toLowerCase())) ||
              haystack.includes(k.toLowerCase())
      );
    });
  }

  // 5. Fallback
  if (results.length === 0) {
    return services.filter((s) => s._loc_type === 'hub').slice(0, 3);
  }

  // 6. Best 3
  return results.slice(0, 3);
}

export function getCategoryColor(cats) {
  if (!cats || cats.length === 0) return '#9e9890';
  // Find first known category
  for (const c of cats) {
    if (CATEGORY_COLORS[c]) return CATEGORY_COLORS[c];
  }
  return '#9e9890';
}
