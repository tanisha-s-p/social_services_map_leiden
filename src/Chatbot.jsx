import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORY_COLORS, CATEGORIES } from './utils';

// ─── Gemini setup ─────────────────────────────────────────────────────────────
const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: 'gemini-flash-latest',
  generationConfig: { responseMimeType: 'application/json' },
});

// ─── Constants ────────────────────────────────────────────────────────────────
const WIJKTEAM_PHONE = '071 - 516 78 77';

const HOUSEHOLD_OPTIONS = [
  'Ik ben student',
  'Ik heb kinderen',
  'Ik heb een chronische ziekte',
  'Ik heb huisdieren',
  'Wil ik niet zeggen',
];

const AGE_OPTIONS = ['Onder 18', '18–26', '27–65', '65+'];

// Steps
const STEP = {
  GDPR: 0,
  CATEGORY: 1,
  AGE: 2,
  HOUSEHOLD: 3,
  FREETEXT: 4,
  LOADING: 5,
  RESULTS: 6,
  SATISFIED: 7,
  NEWRESULTS: 8,
  LOADING2: 9,
};

// ─── sessionStorage helpers ───────────────────────────────────────────────────
const ssLoad = (key, fallback) => {
  try {
    const v = sessionStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const ssSave = (key, value) => {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
};
const SS_KEYS = ['ray_step','ray_userData','ray_recs','ray_recs2','ray_intro','ray_intro2','ray_prevIds'];
const ssClear = () => SS_KEYS.forEach(k => sessionStorage.removeItem(k));

// ─── Component ────────────────────────────────────────────────────────────────
export default function Chatbot({ services, onClose, onHighlight }) {
  const [step, setStep] = useState(() => ssLoad('ray_step', STEP.GDPR));
  const [userData, setUserData] = useState(() =>
    ssLoad('ray_userData', { categories: [], age: '', household: [], freeText: '' })
  );
  const [recommendations,  setRecommendations]  = useState(() => ssLoad('ray_recs',  []));
  const [recommendations2, setRecommendations2] = useState(() => ssLoad('ray_recs2', []));
  const [introText,  setIntroText]  = useState(() => ssLoad('ray_intro',  ''));
  const [introText2, setIntroText2] = useState(() => ssLoad('ray_intro2', ''));
  const [apiError,   setApiError]   = useState('');
  const [previousIds, setPreviousIds] = useState(() => ssLoad('ray_prevIds', []));

  const bodyRef = useRef(null);

  // ── Persist state to sessionStorage (auto-cleared on page refresh) ───────────
  useEffect(() => { ssSave('ray_step',     step);             }, [step]);
  useEffect(() => { ssSave('ray_userData', userData);         }, [userData]);
  useEffect(() => { ssSave('ray_recs',     recommendations);  }, [recommendations]);
  useEffect(() => { ssSave('ray_recs2',    recommendations2); }, [recommendations2]);
  useEffect(() => { ssSave('ray_intro',    introText);        }, [introText]);
  useEffect(() => { ssSave('ray_intro2',   introText2);       }, [introText2]);
  useEffect(() => { ssSave('ray_prevIds',  previousIds);      }, [previousIds]);

  // ── Re-apply sidebar highlights when chat is reopened mid-conversation ────────
  useEffect(() => {
    if (!onHighlight) return;
    if (step >= STEP.NEWRESULTS && recommendations2.length > 0) {
      onHighlight(recommendations2.map(c => c.service));
    } else if (step >= STEP.RESULTS && recommendations.length > 0) {
      onHighlight(recommendations.map(c => c.service));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [step, recommendations, recommendations2]);

  // ── Gemini call ───────────────────────────────────────────────────────────────
  const fetchRecommendations = async (data, excludeIds = []) => {
    if (!apiKey) {
      throw new Error('Geen API-sleutel gevonden. Voeg REACT_APP_GEMINI_API_KEY toe aan je .env bestand.');
    }

    const servicesContext = services
      .map(
        (s) =>
          `ID: ${s.service_id} | Naam: ${s.name} | Categorie: ${s.category || ''} | Doelgroep: ${s.target_group || ''} | Beschrijving: ${s.description || ''}`
      )
      .join('\n');

    const excludeClause =
      excludeIds.length > 0
        ? `Geef NIET de volgende service IDs terug (al eerder aanbevolen): ${excludeIds.join(', ')}.`
        : '';

    const prompt = `
Je bent Ray, een vriendelijke Nederlandse hulpwijzer voor de Sociale Kaart van Leiden.
Schrijf in eenvoudig, warm Nederlands. Gebruik "je" en "jou", nooit "u".

De gebruiker heeft dit profiel:
- Hulp nodig bij: ${data.categories.join(', ')}
- Leeftijd: ${data.age}
- Situatie: ${data.household.join(', ')}
- Omschrijving: ${data.freeText || 'Niet ingevuld'}

Beschikbare diensten:
${servicesContext}

${excludeClause}

Kies PRECIES 3 diensten die het beste passen bij het profiel van de gebruiker.
Geef je antwoord ALLEEN als een JSON array met exact dit formaat:
[
  {
    "service_id": "SRV001",
    "name": "Naam van de dienst",
    "explanation": "Één warme zin waarom deze dienst past bij de situatie van de gebruiker."
  }
]

Geef ook een korte intro terug. Het volledige antwoord moet dit formaat hebben:
{
  "intro": "Één of twee warme zinnen als introductie.",
  "results": [
    { "service_id": "SRV001", "name": "...", "explanation": "..." },
    { "service_id": "SRV002", "name": "...", "explanation": "..." },
    { "service_id": "SRV003", "name": "...", "explanation": "..." }
  ]
}
    `.trim();

    const result = await model.generateContent(prompt);
    const raw = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const arr = JSON.parse(raw);
      parsed = { intro: '', results: arr };
    }

    return parsed;
  };

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleCategoryToggle = (cat) => {
    setUserData((prev) => {
      const has = prev.categories.includes(cat);
      return {
        ...prev,
        categories: has
          ? prev.categories.filter((c) => c !== cat)
          : [...prev.categories, cat],
      };
    });
  };

  const handleHouseholdToggle = (opt) => {
    setUserData((prev) => {
      if (opt === 'Wil ik niet zeggen') {
        return { ...prev, household: ['Wil ik niet zeggen'] };
      }
      const filtered = prev.household.filter((h) => h !== 'Wil ik niet zeggen');
      const has = filtered.includes(opt);
      return {
        ...prev,
        household: has ? filtered.filter((h) => h !== opt) : [...filtered, opt],
      };
    });
  };

  const handleSearch = async () => {
    setStep(STEP.LOADING);
    setApiError('');
    try {
      const parsed = await fetchRecommendations(userData, []);
      const intro = parsed.intro || '';
      const results = parsed.results || [];

      const serviceMap = {};
      services.forEach((s) => { serviceMap[s.service_id] = s; });

      const cards = results
        .map((r) => ({
          service: serviceMap[r.service_id],
          explanation: r.explanation,
          name: r.name,
        }))
        .filter((c) => c.service);

      setIntroText(intro);
      setRecommendations(cards);
      setPreviousIds(results.map((r) => r.service_id));
      if (onHighlight) onHighlight(cards.map((c) => c.service));
      setStep(STEP.RESULTS);
    } catch (e) {
      setApiError(e.message || 'Er is een fout opgetreden.');
      setStep(STEP.RESULTS);
    }
  };

  const handleNotHappy = async () => {
    setStep(STEP.LOADING2);
    setApiError('');
    try {
      const parsed = await fetchRecommendations(userData, previousIds);
      const intro = parsed.intro || '';
      const results = parsed.results || [];

      const serviceMap = {};
      services.forEach((s) => { serviceMap[s.service_id] = s; });

      const cards = results
        .map((r) => ({
          service: serviceMap[r.service_id],
          explanation: r.explanation,
          name: r.name,
        }))
        .filter((c) => c.service);

      setIntroText2(intro);
      setRecommendations2(cards);
      setPreviousIds((prev) => [...prev, ...results.map((r) => r.service_id)]);
      if (onHighlight) onHighlight(cards.map((c) => c.service));
      setStep(STEP.NEWRESULTS);
    } catch (e) {
      setApiError(e.message || 'Er is een fout opgetreden.');
      setStep(STEP.NEWRESULTS);
    }
  };

  const reset = () => {
    ssClear();
    setStep(STEP.GDPR);
    setUserData({ categories: [], age: '', household: [], freeText: '' });
    setRecommendations([]);
    setRecommendations2([]);
    setIntroText('');
    setIntroText2('');
    setApiError('');
    setPreviousIds([]);
    if (onHighlight) onHighlight([]);
  };

  // ── Result card renderer ───────────────────────────────────────────────────────
  const renderCards = (cards) =>
    cards.map(({ service: s, explanation }) => (
      <div key={s.service_id} className="chat-result-card">
        <div className="chat-result-name">{s.name}</div>
        <div className="chat-result-why">{explanation}</div>
        <div className="chat-result-meta">
          {s.phone && (
            <a href={`tel:${s.phone}`}>📞 {s.phone}</a>
          )}
          {s.website && s.website.startsWith('http') && (
            <a href={s.website} target="_blank" rel="noreferrer">
              🔗 Website
            </a>
          )}
          {s._primary_loc?.address && (
            <span style={{ fontSize: 12, color: '#9e9890' }}>
              📍 {s._primary_loc.address}
            </span>
          )}
        </div>
      </div>
    ));

  // ── Loading bubble ─────────────────────────────────────────────────────────────
  const LoadingBubble = () => (
    <div className="chat-bubble" style={{ marginTop: 14 }}>
      <div className="bubble-avatar">🧭</div>
      <div className="bubble-text">
        <div className="loading-dots">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );

  // ── Ray bubble helper ──────────────────────────────────────────────────────────
  const RayBubble = ({ children, style }) => (
    <div className="chat-bubble" style={style}>
      <div className="bubble-avatar">🧭</div>
      <div className="bubble-text">{children}</div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="chat-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="chat-modal">

        {/* Header */}
        <div className="chat-header">
          <div className="ray-avatar">🧭</div>
          <div className="chat-header-info">
            <h3>Ray</h3>
            <p>AI Hulpwijzer · Sociale Kaart Leiden</p>
          </div>
          <button className="chat-close" onClick={onClose} aria-label="Sluiten">✕</button>
        </div>

        {/* Progress bar — steps 1–4 */}
        <div className="chat-progress">
          {[STEP.CATEGORY, STEP.AGE, STEP.HOUSEHOLD, STEP.FREETEXT].map((s, i) => (
            <div
              key={i}
              className={`progress-dot ${
                step > s ? 'done' : step === s ? 'current' : ''
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="chat-body" ref={bodyRef}>

          {/* ── GDPR ── */}
          {step === STEP.GDPR && (
            <>
              <RayBubble>
                <strong>Hallo! Ik ben Ray, een AI-hulpwijzer.</strong>
                <br /><br />
                Voordat we beginnen, wil ik je informeren:
                <br /><br />
                🤖 <strong>Ik ben kunstmatige intelligentie (AI)</strong>, geen mens. Mijn antwoorden worden automatisch gegenereerd.
                <br /><br />
                🔒 <strong>Privacy (AVG/GDPR):</strong> De informatie die je invult wordt alleen gebruikt om diensten te zoeken. Er worden <em>geen persoonsgegevens opgeslagen</em> — alles verdwijnt zodra je de pagina vernieuwt.
                <br /><br />
                ⚠️ <strong>Geen medisch of juridisch advies:</strong> Ik geef alleen informatie over hulpdiensten in Leiden.
                <br /><br />
                💬 <strong>Liever een mens?</strong> Bel het Sociaal Wijkteam: <strong>{WIJKTEAM_PHONE}</strong>
              </RayBubble>
              <button className="chat-next-btn" onClick={() => setStep(STEP.CATEGORY)}>
                Ik begrijp het, ga verder →
              </button>
            </>
          )}

          {/* ── CATEGORY ── */}
          {step >= STEP.CATEGORY && step !== STEP.GDPR && (
            <>
              <RayBubble>
                Waar heb je hulp bij nodig? Je kunt meerdere onderwerpen kiezen.
              </RayBubble>
              <div className="chat-option-grid">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`chat-option-btn ${userData.categories.includes(cat) ? 'selected' : ''}`}
                    onClick={() => step === STEP.CATEGORY && handleCategoryToggle(cat)}
                    disabled={step > STEP.CATEGORY}
                  >
                    <span className="opt-color" style={{ background: CATEGORY_COLORS[cat] }} />
                    {cat}
                  </button>
                ))}
              </div>
              {step === STEP.CATEGORY && (
                <button
                  className="chat-next-btn"
                  onClick={() => setStep(STEP.AGE)}
                  disabled={userData.categories.length === 0}
                >
                  Verder →
                </button>
              )}
            </>
          )}

          {/* ── AGE ── */}
          {step >= STEP.AGE && (
            <>
              <RayBubble style={{ marginTop: 14 }}>
                Wat is je leeftijd?
              </RayBubble>
              <div className="chat-options">
                {[...AGE_OPTIONS, 'Wil ik niet zeggen'].map((opt) => (
                  <button
                    key={opt}
                    className={`chat-option-btn ${userData.age === opt ? 'selected' : ''}`}
                    onClick={() => step === STEP.AGE && setUserData((p) => ({ ...p, age: opt }))}
                    disabled={step > STEP.AGE}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {step === STEP.AGE && (
                <button
                  className="chat-next-btn"
                  onClick={() => setStep(STEP.HOUSEHOLD)}
                  disabled={!userData.age}
                >
                  Verder →
                </button>
              )}
            </>
          )}

          {/* ── HOUSEHOLD ── */}
          {step >= STEP.HOUSEHOLD && (
            <>
              <RayBubble style={{ marginTop: 14 }}>
                Bedankt, dat helpt me om beter te zoeken. Kun je iets vertellen over je situatie?
              </RayBubble>
              <div className="chat-options">
                {HOUSEHOLD_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    className={`chat-option-btn ${userData.household.includes(opt) ? 'selected' : ''}`}
                    onClick={() => step === STEP.HOUSEHOLD && handleHouseholdToggle(opt)}
                    disabled={step > STEP.HOUSEHOLD}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {step === STEP.HOUSEHOLD && (
                <button
                  className="chat-next-btn"
                  onClick={() => setStep(STEP.FREETEXT)}
                  disabled={userData.household.length === 0}
                >
                  Verder →
                </button>
              )}
            </>
          )}

          {/* ── FREE TEXT ── */}
          {step >= STEP.FREETEXT && (
            <>
              <RayBubble style={{ marginTop: 14 }}>
                Kun je in een paar woorden beschrijven waar je hulp bij nodig hebt?
              </RayBubble>
              {step === STEP.FREETEXT && (
                <>
                  <textarea
                    className="chat-textarea"
                    placeholder="Bijv: Ik heb moeite met het betalen van mijn rekeningen..."
                    maxLength={300}
                    value={userData.freeText}
                    onChange={(e) =>
                      setUserData((p) => ({ ...p, freeText: e.target.value }))
                    }
                  />
                  <div className="char-counter">{userData.freeText.length}/300</div>
                  <button className="chat-next-btn" onClick={handleSearch}>
                    Zoek hulp voor mij →
                  </button>
                </>
              )}
            </>
          )}

          {/* ── LOADING ── */}
          {(step === STEP.LOADING || step === STEP.LOADING2) && <LoadingBubble />}

          {/* ── RESULTS (first round) ── */}
          {step >= STEP.RESULTS && step !== STEP.LOADING && step !== STEP.LOADING2 && (
            <>
              {apiError && step === STEP.RESULTS ? (
                <RayBubble style={{ marginTop: 14 }}>
                  ⚠️ {apiError}
                  <br /><br />
                  Bel het Sociaal Wijkteam voor persoonlijk advies: <strong>{WIJKTEAM_PHONE}</strong>
                </RayBubble>
              ) : recommendations.length > 0 ? (
                <>
                  {introText && (
                    <RayBubble style={{ marginTop: 14 }}>{introText}</RayBubble>
                  )}
                  <div className="chat-results">{renderCards(recommendations)}</div>
                  {step === STEP.RESULTS && (
                    <div className="chat-options" style={{ marginTop: 12 }}>
                      <button
                        className="chat-option-btn"
                        style={{ background: '#eef5ee', borderColor: '#92c937' }}
                        onClick={() => setStep(STEP.SATISFIED)}
                      >
                        ✅ Dit helpt me verder
                      </button>
                      <button
                        className="chat-option-btn"
                        onClick={handleNotHappy}
                      >
                        🔄 Zoek 3 andere diensten
                      </button>
                      <button className="restart-btn" style={{ marginTop: 8 }} onClick={reset}>
                        ↩ Opnieuw beginnen
                      </button>
                    </div>
                  )}
                </>
              ) : step === STEP.RESULTS ? (
                <RayBubble style={{ marginTop: 14 }}>
                  Ik kon helaas geen passende diensten vinden. Neem contact op met het Sociaal Wijkteam: <strong>{WIJKTEAM_PHONE}</strong>
                </RayBubble>
              ) : null}
            </>
          )}

          {/* ── SATISFIED ── */}
          {step === STEP.SATISFIED && (
            <>
              <RayBubble style={{ marginTop: 14 }}>
                Fijn! Ik hoop dat je snel de juiste hulp vindt. 💚
                <br /><br />
                Wil je toch persoonlijk advies? Bel het Sociaal Wijkteam: <strong>{WIJKTEAM_PHONE}</strong>
              </RayBubble>
              <button className="restart-btn" onClick={reset}>↩ Opnieuw zoeken</button>
            </>
          )}

          {/* ── SECOND RESULTS ── */}
          {step === STEP.NEWRESULTS && (
            <>
              {apiError ? (
                <RayBubble style={{ marginTop: 14 }}>
                  ⚠️ {apiError}
                  <br /><br />
                  Bel het Sociaal Wijkteam: <strong>{WIJKTEAM_PHONE}</strong>
                </RayBubble>
              ) : recommendations2.length > 0 ? (
                <>
                  {introText2 && (
                    <RayBubble style={{ marginTop: 14 }}>{introText2}</RayBubble>
                  )}
                  <div className="chat-results">{renderCards(recommendations2)}</div>
                  <RayBubble style={{ marginTop: 8 }}>
                    Wil je toch persoonlijk advies? Bel het Sociaal Wijkteam: <strong>{WIJKTEAM_PHONE}</strong>
                  </RayBubble>
                </>
              ) : (
                <RayBubble style={{ marginTop: 14 }}>
                  Ik heb helaas geen andere passende diensten gevonden. Bel het Sociaal Wijkteam: <strong>{WIJKTEAM_PHONE}</strong>
                </RayBubble>
              )}
              <button className="restart-btn" onClick={reset}>↩ Opnieuw zoeken</button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}