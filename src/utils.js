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
      const cats = Array.isArray(s.categories) ? s.categories : [];
      return cats.some((c) => selected_categories.includes(c));
    });
  }

  // 2. Age filter
  if (age) {
    let ageNum = null;
    if (age === 'onder 18') ageNum = 12;
    else if (age === '18–26') ageNum = 22;
    else if (age === '27–65') ageNum = 45;
    else if (age === '65+') ageNum = 70;

    if (ageNum !== null) {
      results = results.filter((s) => {
        const min = s.age_min !== '' && s.age_min !== undefined ? Number(s.age_min) : 0;
        const max = s.age_max !== '' && s.age_max !== undefined ? Number(s.age_max) : 99;
        return ageNum >= min && ageNum <= max;
      });
    }
  }

  // 3. Household filter (ignore "wil ik niet zeggen")
  const filteredHousehold = household_type.filter((h) => h !== 'Wil ik niet zeggen');
  if (filteredHousehold.length > 0) {
    results = results.filter((s) => {
      const tags = Array.isArray(s.household_tags) ? s.household_tags : [];
      if (tags.length === 0) return true;
      return filteredHousehold.some((h) => tags.includes(h));
    });
  }

  // 4. Keyword filter
  if (selected_keywords.length > 0) {
    results = results.filter((s) => {
      const kws = Array.isArray(s.keywords) ? s.keywords : [];
      const name = (s.name || '').toLowerCase();
      const desc = (s.description || '').toLowerCase();
      return selected_keywords.some(
        (k) => kws.includes(k) || name.includes(k.toLowerCase()) || desc.includes(k.toLowerCase())
      );
    });
  }

  // 5. Fallback to hubs
  if (results.length === 0) {
    return services.filter((s) => s.location_type === 'hub').slice(0, 3);
  }

  // 6. Return best 3
  return results.slice(0, 3);
}

export function getCategoryColor(cats) {
  if (!cats || cats.length === 0) return '#9e9890';
  return CATEGORY_COLORS[cats[0]] || '#9e9890';
}
