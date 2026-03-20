import React, { useState, useRef, useEffect } from 'react';
import { CATEGORY_COLORS, CATEGORIES } from './utils';

const HOUSEHOLD_OPTIONS = [
  'Ik ben student',
  'Ik heb kinderen',
  'Ik heb een chronische ziekte',
  'Ik heb huisdieren',
  'Wil ik niet zeggen',
];

const AGE_OPTIONS = ['Onder 18', '18–26', '27–65', '65+'];

const WIJKTEAM_PHONE = '071 - 516 78 77';

// ─── Gemini API call ────────────────────────────────────────────────────────
async function callGemini(prompt) {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Geen Gemini API-sleutel gevonden. Voeg REACT_APP_GEMINI_API_KEY toe aan je .env bestand.');

  const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 900,
          },
          systemInstruction: {
            parts: [{
              text: `Je bent Ray, een vriendelijke Nederlandse hulpwijzer voor de Sociale Kaart van Leiden.
Je spreekt alleen over hulpdiensten en sociale voorzieningen in Leiden en omgeving.
Schrijf in eenvoudig, warm Nederlands op B1-niveau. Geen jargon. Gebruik altijd "je" en "jou", nooit "u".
Geef altijd exact het JSON-formaat terug dat gevraagd wordt. Geen extra tekst buiten de JSON.`
            }]
          }
        }),
      }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API fout: ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text;
}

// ─── Build the selection prompt ─────────────────────────────────────────────
function buildPrompt(session, allServices, excludeIds = []) {
  const available = allServices.filter(
      (s) => !excludeIds.includes(s.service_id)
  );

  const serviceList = available
      .map((s) => [
        `ID: ${s.service_id}`,
        `Naam: ${s.name}`,
        `Categorie: ${s.category || ''}`,
        `Doelgroep: ${s.target_group || ''}`,
        `Beschrijving: ${s.description || ''}`,
        `Kosten: ${s.cost_to_user || 'Gratis'}`,
        `Toegang: ${s.access_type || ''}`,
        `Trefwoorden: ${s.keywords || ''}`,
      ].join(' | '))
      .join('\n');

  const excluding = excludeIds.length > 0
      ? `\n\nLET OP: Sluit de volgende service-ID's uit omdat ze al eerder getoond zijn: ${excludeIds.join(', ')}`
      : '';

  return `De gebruiker heeft de volgende informatie gedeeld:
- Categorieën van hulpvraag: ${session.selected_categories.join(', ') || 'Niet ingevuld'}
- Leeftijdsgroep: ${session.age || 'Niet ingevuld'}
- Persoonlijke situatie: ${session.household_type.join(', ') || 'Niet ingevuld'}
- Eigen omschrijving: ${session.problem_description || 'Niet ingevuld'}
${excluding}

Hier zijn alle beschikbare diensten:
${serviceList}

Kies de 3 meest passende diensten voor deze gebruiker.

BELANGRIJK: Geef je antwoord ALLEEN als geldig JSON. Geen markdown, geen backticks, geen tekst ervoor of erna. Gebruik geen enters of speciale tekens binnen de string-waarden. Elke "intro" en "why" waarde moet op één regel staan zonder regelafbrekingen.

Gebruik exact dit formaat:
{"intro":"Een warme introductiezin van maximaal 2 zinnen.","results":[{"service_id":"SRV001","why":"Één zin waarom deze dienst past."},{"service_id":"SRV002","why":"Één zin waarom deze dienst past."},{"service_id":"SRV003","why":"Één zin waarom deze dienst past."}]}`;
}

// ─── Parse Gemini JSON response ──────────────────────────────────────────────
function parseGeminiResponse(text) {
  // 1. Strip markdown code fences
  let cleaned = text.replace(/```json|```/gi, '').trim();

  // 2. Extract the outermost {...} block in case Gemini added prose around it
  const braceStart = cleaned.indexOf('{');
  const braceEnd = cleaned.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
    cleaned = cleaned.slice(braceStart, braceEnd + 1);
  }

  // 3. Remove literal newlines/tabs inside string values (causes "Unterminated string" errors)
  cleaned = cleaned
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\\n/g, ' ');

  // 4. Try to parse
  try {
    return JSON.parse(cleaned);
  } catch (firstErr) {
    // 5. Regex fallback: extract service_ids and whys manually
    const idMatches = [...text.matchAll(/"service_id"\s*:\s*"([^"]+)"/g)];
    const whyMatches = [...text.matchAll(/"why"\s*:\s*"([^"]+)"/g)];
    const introMatch = text.match(/"intro"\s*:\s*"([^"]+)"/);

    if (idMatches.length > 0) {
      return {
        intro: introMatch ? introMatch[1] : '',
        results: idMatches.map((m, i) => ({
          service_id: m[1],
          why: whyMatches[i] ? whyMatches[i][1] : '',
        })),
      };
    }

    // 6. Nothing worked
    throw new Error('JSON parse mislukt: ' + firstErr.message);
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Chatbot({ services, onClose, onHighlight }) {
  // Steps: 0=gdpr, 1=categories, 2=age, 3=household, 4=description, 5=results, 6=satisfaction, 7=new-results
  const [step, setStep] = useState(0);
  const [session, setSession] = useState({
    selected_categories: [],
    age: '',
    household_type: [],
    problem_description: '',
  });
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // First round results
  const [intro, setIntro] = useState('');
  const [resultCards, setResultCards] = useState([]); // [{service, why}]

  // Second round (not satisfied)
  const [intro2, setIntro2] = useState('');
  const [resultCards2, setResultCards2] = useState([]);

  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [step, loading, resultCards, resultCards2]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const handleCategoryToggle = (cat) => {
    setSession((prev) => {
      const has = prev.selected_categories.includes(cat);
      return {
        ...prev,
        selected_categories: has
            ? prev.selected_categories.filter((c) => c !== cat)
            : [...prev.selected_categories, cat],
      };
    });
  };

  const handleHouseholdToggle = (opt) => {
    setSession((prev) => {
      if (opt === 'Wil ik niet zeggen') {
        return { ...prev, household_type: ['Wil ik niet zeggen'] };
      }
      const filtered = prev.household_type.filter((h) => h !== 'Wil ik niet zeggen');
      const has = filtered.includes(opt);
      return {
        ...prev,
        household_type: has ? filtered.filter((h) => h !== opt) : [...filtered, opt],
      };
    });
  };

  // Build a lookup map from service_id → service object
  const serviceMap = {};
  services.forEach((s) => { serviceMap[s.service_id] = s; });

  // ── First API call ────────────────────────────────────────────────────────
  const runFirstSearch = async () => {
    setLoading(true);
    setApiError('');
    try {
      const prompt = buildPrompt(session, services, []);
      const raw = await callGemini(prompt);
      const parsed = parseGeminiResponse(raw);

      const cards = (parsed.results || [])
          .map((r) => ({ service: serviceMap[r.service_id], why: r.why }))
          .filter((c) => c.service); // drop any IDs Gemini hallucinated

      setIntro(parsed.intro || '');
      setResultCards(cards);
      if (onHighlight) onHighlight(cards.map((c) => c.service));
      setStep(5);
    } catch (e) {
      setApiError(e.message || 'Er is een fout opgetreden.');
      setStep(5);
    }
    setLoading(false);
  };

  // ── Second API call (not satisfied) ───────────────────────────────────────
  const runSecondSearch = async () => {
    setLoading(true);
    setApiError('');
    const excludeIds = resultCards.map((c) => c.service.service_id);
    try {
      const prompt = buildPrompt(session, services, excludeIds);
      const raw = await callGemini(prompt);
      const parsed = parseGeminiResponse(raw);

      const cards = (parsed.results || [])
          .map((r) => ({ service: serviceMap[r.service_id], why: r.why }))
          .filter((c) => c.service);

      setIntro2(parsed.intro || '');
      setResultCards2(cards);
      if (onHighlight) onHighlight(cards.map((c) => c.service));
      setStep(7);
    } catch (e) {
      setApiError(e.message || 'Er is een fout opgetreden.');
      setStep(7);
    }
    setLoading(false);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep(0);
    setSession({ selected_categories: [], age: '', household_type: [], problem_description: '' });
    setLoading(false);
    setApiError('');
    setIntro('');
    setResultCards([]);
    setIntro2('');
    setResultCards2([]);
  };

  // ── Result card renderer ──────────────────────────────────────────────────
  const renderCards = (cards) =>
      cards.map(({ service: s, why }) => (
          <div key={s.service_id || s.name} className="chat-result-card">
            <div className="chat-result-name">{s.name}</div>
            <div className="chat-result-why">{why || s.description}</div>
            <div className="chat-result-meta">
              {s.phone && <a href={`tel:${s.phone}`}>📞 {s.phone}</a>}
              {s.website && s.website.startsWith('http') && (
                  <a href={s.website} target="_blank" rel="noreferrer">🔗 Website</a>
              )}
              {s._primary_loc?.address && (
                  <span style={{ fontSize: 12, color: '#9e9890' }}>📍 {s._primary_loc.address}</span>
              )}
            </div>
          </div>
      ));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
      <div className="chat-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
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

          {/* Progress bar — steps 1–4 only */}
          <div className="chat-progress">
            {[1, 2, 3, 4].map((i) => (
                <div
                    key={i}
                    className={`progress-dot ${step > i ? 'done' : step === i ? 'current' : ''}`}
                />
            ))}
          </div>

          {/* Body */}
          <div className="chat-body" ref={bodyRef}>

            {/* ── STEP 0: GDPR disclaimer ── */}
            {step === 0 && (
                <>
                  <div className="chat-bubble">
                    <div className="bubble-avatar">🧭</div>
                    <div className="bubble-text">
                      <strong>Hallo! Ik ben Ray, een AI-hulpwijzer.</strong>
                      <br /><br />
                      Voordat we beginnen, wil ik je informeren over hoe ik werk:
                      <br /><br />
                      🤖 <strong>Ik ben kunstmatige intelligentie (AI)</strong>, geen mens. Mijn antwoorden worden automatisch gegenereerd op basis van de informatie die je deelt.
                      <br /><br />
                      🔒 <strong>Privacy (AVG/GDPR):</strong> De informatie die je invult wordt alleen gebruikt om diensten voor jou te zoeken. Er worden <em>geen persoonsgegevens opgeslagen</em> — alles verdwijnt zodra je dit venster sluit. Je antwoorden worden anoniem verwerkt via de AI.
                      <br /><br />
                      ⚠️ <strong>Geen medisch of juridisch advies:</strong> Ik geef alleen informatie over beschikbare hulpdiensten in Leiden. Voor persoonlijk advies, neem contact op met een professional.
                      <br /><br />
                      💬 <strong>Liever een mens spreken?</strong> Je kunt altijd het Sociaal Wijkteam bellen: <strong>{WIJKTEAM_PHONE}</strong>
                    </div>
                  </div>
                  <button className="chat-next-btn" onClick={() => setStep(1)}>
                    Ik begrijp het, ga verder →
                  </button>
                </>
            )}

            {/* ── STEP 1: Categories ── */}
            {step >= 1 && step !== 0 && (
                <>
                  <div className="chat-bubble">
                    <div className="bubble-avatar">🧭</div>
                    <div className="bubble-text">
                      Waar heb je hulp bij nodig? Je kunt meerdere onderwerpen kiezen.
                    </div>
                  </div>
                  <div className="chat-option-grid">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            className={`chat-option-btn ${session.selected_categories.includes(cat) ? 'selected' : ''}`}
                            onClick={() => step === 1 && handleCategoryToggle(cat)}
                            disabled={step > 1}
                        >
                          <span className="opt-color" style={{ background: CATEGORY_COLORS[cat] }} />
                          {cat}
                        </button>
                    ))}
                  </div>
                  {step === 1 && (
                      <button
                          className="chat-next-btn"
                          onClick={() => setStep(2)}
                          disabled={session.selected_categories.length === 0}
                      >
                        Verder →
                      </button>
                  )}
                </>
            )}

            {/* ── STEP 2: Age ── */}
            {step >= 2 && (
                <>
                  <div className="chat-bubble" style={{ marginTop: 14 }}>
                    <div className="bubble-avatar">🧭</div>
                    <div className="bubble-text">
                      Wat is je leeftijd? Dit helpt me om passende diensten te vinden.
                    </div>
                  </div>
                  <div className="chat-options">
                    {[...AGE_OPTIONS, 'Wil ik niet zeggen'].map((opt) => (
                        <button
                            key={opt}
                            className={`chat-option-btn ${session.age === opt ? 'selected' : ''}`}
                            onClick={() => step === 2 && setSession((p) => ({ ...p, age: opt }))}
                            disabled={step > 2}
                        >
                          {opt}
                        </button>
                    ))}
                  </div>
                  {step === 2 && (
                      <button
                          className="chat-next-btn"
                          onClick={() => setStep(3)}
                          disabled={!session.age}
                      >
                        Verder →
                      </button>
                  )}
                </>
            )}

            {/* ── STEP 3: Household ── */}
            {step >= 3 && (
                <>
                  <div className="chat-bubble" style={{ marginTop: 14 }}>
                    <div className="bubble-avatar">🧭</div>
                    <div className="bubble-text">
                      Bedankt, dat helpt me om beter te zoeken. Kun je iets vertellen over je situatie?
                    </div>
                  </div>
                  <div className="chat-options">
                    {HOUSEHOLD_OPTIONS.map((opt) => (
                        <button
                            key={opt}
                            className={`chat-option-btn ${session.household_type.includes(opt) ? 'selected' : ''}`}
                            onClick={() => step === 3 && handleHouseholdToggle(opt)}
                            disabled={step > 3}
                        >
                          {opt}
                        </button>
                    ))}
                  </div>
                  {step === 3 && (
                      <button
                          className="chat-next-btn"
                          onClick={() => setStep(4)}
                          disabled={session.household_type.length === 0}
                      >
                        Verder →
                      </button>
                  )}
                </>
            )}

            {/* ── STEP 4: Free description ── */}
            {step >= 4 && (
                <>
                  <div className="chat-bubble" style={{ marginTop: 14 }}>
                    <div className="bubble-avatar">🧭</div>
                    <div className="bubble-text">
                      Kun je in een paar woorden beschrijven waar je hulp bij nodig hebt?
                    </div>
                  </div>
                  {step === 4 && (
                      <>
                  <textarea
                      className="chat-textarea"
                      placeholder="Bijv: Ik heb moeite met het betalen van mijn rekeningen..."
                      maxLength={300}
                      value={session.problem_description}
                      onChange={(e) => setSession((p) => ({ ...p, problem_description: e.target.value }))}
                  />
                        <div className="char-counter">{session.problem_description.length}/300</div>
                        <button
                            className="chat-next-btn"
                            onClick={runFirstSearch}
                            disabled={loading}
                        >
                          {loading ? 'Zoeken...' : 'Zoek hulp voor mij →'}
                        </button>
                      </>
                  )}
                </>
            )}

            {/* ── Loading indicator ── */}
            {loading && (
                <div className="chat-bubble" style={{ marginTop: 14 }}>
                  <div className="bubble-avatar">🧭</div>
                  <div className="bubble-text">
                    <div className="loading-dots"><span /><span /><span /></div>
                  </div>
                </div>
            )}

            {/* ── STEP 5: First results ── */}
            {step === 5 && !loading && (
                <>
                  {apiError ? (
                      <div className="chat-bubble">
                        <div className="bubble-avatar">🧭</div>
                        <div className="bubble-text">
                          ⚠️ {apiError}
                          <br /><br />
                          Je kunt het Sociaal Wijkteam bellen voor persoonlijk advies: <strong>{WIJKTEAM_PHONE}</strong>
                        </div>
                      </div>
                  ) : (
                      <>
                        {intro && (
                            <div className="chat-bubble">
                              <div className="bubble-avatar">🧭</div>
                              <div className="bubble-text">{intro}</div>
                            </div>
                        )}

                        {resultCards.length > 0 ? (
                            <div className="chat-results">{renderCards(resultCards)}</div>
                        ) : (
                            <div className="chat-bubble">
                              <div className="bubble-avatar">🧭</div>
                              <div className="bubble-text">
                                Ik kon helaas geen passende diensten vinden. Neem contact op met het Sociaal Wijkteam: <strong>{WIJKTEAM_PHONE}</strong>
                              </div>
                            </div>
                        )}

                        {/* Satisfaction question */}
                        {resultCards.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                              <div className="chat-bubble">
                                <div className="bubble-avatar">🧭</div>
                                <div className="bubble-text">
                                  Ben je tevreden met deze resultaten, of wil je dat ik andere diensten zoek?
                                </div>
                              </div>
                              <div className="chat-options" style={{ marginTop: 8 }}>
                                <button className="chat-option-btn" onClick={() => setStep(6)} style={{ background: '#eef5ee', borderColor: '#92c937' }}>
                                  ✅ Ja, dit helpt me verder
                                </button>
                                <button className="chat-option-btn" onClick={runSecondSearch} disabled={loading}>
                                  🔄 Nee, zoek andere diensten
                                </button>
                              </div>
                            </div>
                        )}
                      </>
                  )}
                </>
            )}

            {/* ── STEP 6: Satisfied ending ── */}
            {step === 6 && (
                <>
                  <div className="chat-bubble">
                    <div className="bubble-avatar">🧭</div>
                    <div className="bubble-text">
                      Fijn! Ik hoop dat je snel de juiste hulp vindt. 💚
                      <br /><br />
                      Heb je toch nog vragen of wil je persoonlijk advies? Bel het Sociaal Wijkteam: <strong>{WIJKTEAM_PHONE}</strong>
                    </div>
                  </div>
                  <button className="restart-btn" onClick={reset}>↩ Opnieuw zoeken</button>
                </>
            )}

            {/* ── STEP 7: Second results (not satisfied) ── */}
            {step === 7 && !loading && (
                <>
                  {apiError ? (
                      <div className="chat-bubble">
                        <div className="bubble-avatar">🧭</div>
                        <div className="bubble-text">
                          ⚠️ {apiError}
                          <br /><br />
                          Bel het Sociaal Wijkteam voor persoonlijk advies: <strong>{WIJKTEAM_PHONE}</strong>
                        </div>
                      </div>
                  ) : (
                      <>
                        {intro2 && (
                            <div className="chat-bubble">
                              <div className="bubble-avatar">🧭</div>
                              <div className="bubble-text">{intro2}</div>
                            </div>
                        )}
                        {resultCards2.length > 0 ? (
                            <div className="chat-results">{renderCards(resultCards2)}</div>
                        ) : (
                            <div className="chat-bubble">
                              <div className="bubble-avatar">🧭</div>
                              <div className="bubble-text">
                                Ik heb helaas geen andere passende diensten gevonden. Bel het Sociaal Wijkteam voor persoonlijk advies: <strong>{WIJKTEAM_PHONE}</strong>
                              </div>
                            </div>
                        )}
                        <div className="chat-bubble" style={{ marginTop: 8 }}>
                          <div className="bubble-avatar">🧭</div>
                          <div className="bubble-text">
                            Wil je toch persoonlijk advies? Het Sociaal Wijkteam helpt je graag verder: <strong>{WIJKTEAM_PHONE}</strong>
                          </div>
                        </div>
                      </>
                  )}
                  <button className="restart-btn" onClick={reset}>↩ Opnieuw zoeken</button>
                </>
            )}

          </div>
        </div>
      </div>
  );
}
