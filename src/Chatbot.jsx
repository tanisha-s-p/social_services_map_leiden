import React, { useState, useRef, useEffect } from 'react';
import { filterServices, CATEGORY_COLORS, CATEGORIES, ACCESS_LABELS } from './utils';

const STEPS = 6;

const HOUSEHOLD_OPTIONS = [
  'Ik ben student',
  'Ik heb kinderen',
  'Ik heb een chronische ziekte',
  'Ik heb huisdieren',
  'Wil ik niet zeggen',
];

const AGE_OPTIONS = ['Onder 18', '18–26', '27–65', '65+'];

export default function Chatbot({ services, onClose, onHighlight }) {
  const [step, setStep] = useState(0);
  const [session, setSession] = useState({
    selected_categories: [],
    age: '',
    household_type: [],
    problem_description: '',
    selected_keywords: [],
  });
  const [loading, setLoading] = useState(false);
  const [rayIntro, setRayIntro] = useState('');
  const [filteredServices, setFilteredServices] = useState([]);
  const [apiError, setApiError] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [step, loading]);

  // Auto-advance from step 0
  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 800);
      return () => clearTimeout(t);
    }
  }, [step]);

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

  const runChat = async () => {
    setLoading(true);
    const results = filterServices(services, session);
    setFilteredServices(results);

    const userMsg = `De gebruiker heeft de volgende informatie gedeeld:
- Zorgen: ${session.selected_categories.join(', ') || 'Niet ingevuld'}
- Leeftijd: ${session.age || 'Niet ingevuld'}
- Situatie: ${session.household_type.join(', ') || 'Niet ingevuld'}
- Omschrijving: ${session.problem_description || 'Niet ingevuld'}
- Trefwoorden: ${session.selected_keywords.join(', ') || 'Geen'}

De volgende diensten zijn gevonden die passen:
${results.map((s) => `- ${s.name}: ${s.description}`).join('\n')}

Schrijf een korte, warme introductie (max 3 zinnen) die uitlegt waarom deze diensten zijn gevonden en de gebruiker geruststelt. Schrijf daarna voor elke gevonden dienst één zin die uitlegt waarom die specifiek past bij de situatie van de gebruiker. Label elke zin met de naam van de dienst tussen haakjes, zoals: (Voedselbank Leiden) Deze dienst past omdat...`;

    try {
      const apiKey = process.env.REACT_APP_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error('No API key');

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
          system: `Je bent Ray, een vriendelijke Nederlandse hulpwijzer voor de Sociale Kaart van Leiden. 
Je spreekt alleen over hulpdiensten en sociale voorzieningen in Leiden en omgeving.
Als iemand een vraag stelt die niets te maken heeft met hulpverlening of sociale kaart, zeg dan vriendelijk: "Dat kan ik je helaas niet vertellen, maar ik help je graag verder met het vinden van hulp in Leiden."
Schrijf in eenvoudig, warm Nederlands. Geen jargon. Maximaal 4 zinnen.
Gebruik altijd "je" en "jou", nooit "u".`,
          messages: [{ role: 'user', content: userMsg }],
        }),
      });

      const data = await res.json();
      const text = data?.content?.[0]?.text || '';
      setRayIntro(text);
    } catch (e) {
      setApiError(true);
      setRayIntro('');
    }

    setLoading(false);
    setStep(5);
    if (onHighlight) onHighlight(results);
  };

  const parseIntroAndCards = () => {
    if (!rayIntro) return { intro: '', cards: filteredServices.map((s) => ({ service: s, why: '' })) };

    const lines = rayIntro.split('\n').filter(Boolean);
    const intro = lines[0] || '';
    const cards = filteredServices.map((s) => {
      const line = lines.find((l) => l.includes(`(${s.name})`));
      const why = line ? line.replace(`(${s.name})`, '').trim() : '';
      return { service: s, why };
    });
    return { intro, cards };
  };

  const reset = () => {
    setStep(0);
    setSession({
      selected_categories: [],
      age: '',
      household_type: [],
      problem_description: '',
      selected_keywords: [],
    });
    setRayIntro('');
    setFilteredServices([]);
    setApiError(false);
    setLoading(false);
  };

  const { intro, cards } = parseIntroAndCards();

  return (
    <div className="chat-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="chat-modal">
        {/* Header */}
        <div className="chat-header">
          <div className="ray-avatar">🧭</div>
          <div className="chat-header-info">
            <h3>Ray</h3>
            <p>Hulpwijzer Sociale Kaart</p>
          </div>
          <button className="chat-close" onClick={onClose} aria-label="Sluiten">✕</button>
        </div>

        {/* Progress */}
        <div className="chat-progress">
          {[1,2,3,4,5].map((i) => (
            <div
              key={i}
              className={`progress-dot ${step > i ? 'done' : step === i ? 'current' : ''}`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="chat-body" ref={bodyRef}>

          {/* STEP 0 */}
          {step >= 0 && (
            <div className="chat-bubble">
              <div className="bubble-avatar">🧭</div>
              <div className="bubble-text">
                Hallo! Mijn naam is Ray. Ik help je zoeken naar hulp en ondersteuning in Leiden. Ik stel je een paar korte vragen om de beste diensten voor jou te vinden.
              </div>
            </div>
          )}

          {/* STEP 1 — categories */}
          {step >= 1 && (
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
                    onClick={() => handleCategoryToggle(cat)}
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

          {/* STEP 2 — age */}
          {step >= 2 && (
            <>
              <div className="chat-bubble" style={{ marginTop: 14 }}>
                <div className="bubble-avatar">🧭</div>
                <div className="bubble-text">
                  Wat is je leeftijd? Dit helpt me om passende diensten te zoeken.
                </div>
              </div>
              <div className="chat-options">
                {[...AGE_OPTIONS, 'Wil ik niet zeggen'].map((opt) => (
                  <button
                    key={opt}
                    className={`chat-option-btn ${session.age === opt ? 'selected' : ''}`}
                    onClick={() => setSession((p) => ({ ...p, age: opt }))}
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

          {/* STEP 3 — household */}
          {step >= 3 && (
            <>
              <div className="chat-bubble" style={{ marginTop: 14 }}>
                <div className="bubble-avatar">🧭</div>
                <div className="bubble-text">
                  Bedankt, dat helpt me om beter te zoeken. Kun je iets vertellen over je situatie? (meerdere antwoorden mogelijk)
                </div>
              </div>
              <div className="chat-options">
                {HOUSEHOLD_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    className={`chat-option-btn ${session.household_type.includes(opt) ? 'selected' : ''}`}
                    onClick={() => handleHouseholdToggle(opt)}
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

          {/* STEP 4 — description */}
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
                    onClick={runChat}
                    disabled={loading}
                  >
                    {loading ? 'Zoeken...' : 'Zoek hulp voor mij →'}
                  </button>
                </>
              )}
            </>
          )}

          {/* Loading */}
          {loading && (
            <div className="chat-bubble">
              <div className="bubble-avatar">🧭</div>
              <div className="bubble-text">
                <div className="loading-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 — results */}
          {step === 5 && !loading && (
            <>
              {intro ? (
                <div className="chat-bubble">
                  <div className="bubble-avatar">🧭</div>
                  <div className="bubble-text">{intro}</div>
                </div>
              ) : apiError ? (
                <div className="chat-bubble">
                  <div className="bubble-avatar">🧭</div>
                  <div className="bubble-text">
                    Ik heb de volgende diensten gevonden die bij jou passen. Klik op een dienst voor meer informatie.
                  </div>
                </div>
              ) : null}

              {filteredServices.length === 0 ? (
                <div className="chat-bubble">
                  <div className="bubble-avatar">🧭</div>
                  <div className="bubble-text">
                    Ik kon helaas geen diensten vinden die precies passen. Probeer het Sociale Wijkteam — zij kunnen je altijd verder helpen.
                  </div>
                </div>
              ) : (
                <div className="chat-results">
                  {cards.map(({ service: s, why }) => (
                    <div key={s.service_id || s.name} className="chat-result-card">
                      <div className="chat-result-name">{s.name}</div>
                      {why && <div className="chat-result-why">{why}</div>}
                      {!why && <div className="chat-result-why">{s.description}</div>}
                      <div className="chat-result-meta">
                        {s.phone && <a href={`tel:${s.phone}`}>📞 {s.phone}</a>}
                        {s.website && <a href={s.website} target="_blank" rel="noreferrer">🔗 Website</a>}
                        {s.address && <span style={{ fontSize: 12, color: '#9e9890' }}>📍 {s.address}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className="restart-btn" onClick={reset}>
                ↩ Opnieuw zoeken
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
