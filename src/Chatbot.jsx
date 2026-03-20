import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini (Ensure your .env has VITE_GEMINI_API_KEY)
const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
  // Force JSON output so we can reliably render the 3 services
  generationConfig: { responseMimeType: "application/json" }
});

const STEPS = {
  INTRO: 'INTRO',
  CATEGORY: 'CATEGORY',
  AGE: 'AGE',
  CIRCUMSTANCES: 'CIRCUMSTANCES',
  FREE_TEXT: 'FREE_TEXT',
  LOADING: 'LOADING',
  RESULTS: 'RESULTS',
  FEEDBACK: 'FEEDBACK'
};

export default function Chatbot({ services, onClose, onHighlight }) {
  const [step, setStep] = useState(STEPS.INTRO);
  const [messages, setMessages] = useState([]);
  const [userData, setUserData] = useState({
    categories: [],
    age: '',
    circumstances: [],
    freeText: ''
  });

  // Keep track of previously recommended IDs so we don't repeat them if the user asks for more
  const [previousRecommendations, setPreviousRecommendations] = useState([]);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [messages]);

  // --- 1. INITIALIZATION & GDPR ---
  useEffect(() => {
    addBotMessage(
        "Hoi, ik ben Ray. Voordat we beginnen: ik ben een AI-assistent. Ik gebruik je antwoorden om passende hulp te zoeken. We slaan je gegevens niet langer op dan nodig en delen ze niet met derden. Door verder te gaan, ga je akkoord met onze privacyvoorwaarden."
    );
    setTimeout(() => {
      setStep(STEPS.CATEGORY);
      addBotMessage("Waar heb je hulp bij nodig? Je kunt meerdere onderwerpen kiezen.");
    }, 1500);
  }, []);

  const addBotMessage = (text) => {
    setMessages(prev => [...prev, { sender: 'bot', text }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { sender: 'user', text }]);
  };

  // --- 2. STEP HANDLERS ---
  const handleCategorySelect = (selectedCats) => {
    setUserData(prev => ({ ...prev, categories: selectedCats }));
    addUserMessage(selectedCats.join(', '));
    setStep(STEPS.AGE);
    addBotMessage("Wat is je leeftijdscategorie?");
  };

  const handleAgeSelect = (age) => {
    setUserData(prev => ({ ...prev, age }));
    addUserMessage(age);
    setStep(STEPS.CIRCUMSTANCES);
    addBotMessage("Bedankt, dat helpt me om beter te zoeken. Kun je iets vertellen over je situatie? (Meerdere keuzes mogelijk)");
  };

  const handleCircumstancesSelect = (circs) => {
    setUserData(prev => ({ ...prev, circumstances: circs }));
    addUserMessage(circs.join(', '));
    setStep(STEPS.FREE_TEXT);
    addBotMessage("Kun je in het kort (max 300 tekens) je situatie verder omschrijven?");
  };

  const handleFreeTextSubmit = async (text) => {
    const updatedData = { ...userData, freeText: text };
    setUserData(updatedData);
    addUserMessage(text);
    setStep(STEPS.LOADING);
    addBotMessage("Ik ben nu de beste voorzieningen voor je aan het zoeken...");

    await fetchGeminiRecommendations(updatedData, []);
  };

  // --- 3. GEMINI API LOGIC ---
  const fetchGeminiRecommendations = async (data, excludeIds = []) => {
    try {
      // Prepare the CSV data for the prompt (we only send essential fields to save tokens/processing)
      const servicesContext = services.map(s =>
          `ID: ${s.service_id} | Name: ${s.name} | Category: ${s.category} | Target: ${s.target_group} | Desc: ${s.description}`
      ).join('\n');

      const prompt = `
        You are Ray, a helpful social services assistant for a Dutch municipality.
        The user has provided the following profile:
        - Categories needed: ${data.categories.join(', ')}
        - Age: ${data.age}
        - Circumstances: ${data.circumstances.join(', ')}
        - Situation description: ${data.freeText}

        Available Services Context:
        ${servicesContext}

        Task:
        1. Find EXACTLY 3 services from the Available Services Context that best match the user's profile.
        ${excludeIds.length > 0 ? `2. DO NOT recommend these previously suggested service IDs: ${excludeIds.join(', ')}` : ''}
        3. Explain briefly (in Dutch) why each service is suitable.
        4. Return the result STRICTLY as a JSON array of objects with the following keys:
           "service_id" (string), "name" (string), "explanation" (string).
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const recommendations = JSON.parse(responseText);

      // Save IDs so we don't recommend them again if they click "Not Happy"
      const newRecIds = recommendations.map(r => r.service_id);
      setPreviousRecommendations(prev => [...prev, ...newRecIds]);

      setStep(STEPS.RESULTS);

      // Add the results to the chat
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          isResult: true,
          recommendations,
          text: "Hier zijn 3 diensten die goed bij jouw situatie passen:"
        }
      ]);

      // Add the mandatory social team message
      setTimeout(() => {
        addBotMessage("Mocht je liever persoonlijk advies willen van een medewerker, dan kun je altijd bellen met het Sociale Wijkteam op: 071 - 516 78 77.");
        setStep(STEPS.FEEDBACK);
      }, 1000);

    } catch (error) {
      console.error("Gemini API Error:", error);
      addBotMessage("Sorry, er ging iets mis bij het ophalen van de gegevens. Probeer het later opnieuw.");
      setStep(STEPS.FEEDBACK);
    }
  };

  const handleFeedback = async (isHappy) => {
    if (isHappy) {
      addUserMessage("Ja, dit helpt me verder.");
      addBotMessage("Fijn om te horen! Je kunt dit venster sluiten of de diensten hierboven aanklikken op de kaart.");
      setStep('DONE');
    } else {
      addUserMessage("Nee, ik zoek eigenlijk iets anders.");
      setStep(STEPS.LOADING);
      addBotMessage("Geen probleem. Ik ga 3 andere diensten voor je zoeken...");
      await fetchGeminiRecommendations(userData, previousRecommendations);
    }
  };

  return (
      <div className="chatbot-container">
        <div className="chatbot-header">
          <h3>Praat met Ray (AI)</h3>
          <button onClick={onClose}>X</button>
        </div>

        <div className="chatbot-messages">
          {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <p>{msg.text}</p>
                {/* Render AI JSON results nicely */}
                {msg.isResult && msg.recommendations && (
                    <div className="recommendations-list">
                      {msg.recommendations.map((rec) => (
                          <div key={rec.service_id} className="recommendation-card">
                            <h4>{rec.name}</h4>
                            <p>{rec.explanation}</p>
                            <button onClick={() => onHighlight(rec.service_id)}>
                              Bekijk op de kaart
                            </button>
                          </div>
                      ))}
                    </div>
                )}
              </div>
          ))}
          {step === STEPS.LOADING && <div className="message bot">Typen...</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* DYNAMIC INPUT AREA BASED ON STEP */}
        <div className="chatbot-input-area">
          {step === STEPS.CATEGORY && (
              <MultiSelect
                  options={[
                    'Onkosten en dagelijks leven', 'Gezondheid en zorg',
                    'Wonen en energie besparen', 'Kinderen en opgroeien',
                    'Studeren en werken', 'Hulp bij schulden'
                  ]}
                  onSubmit={handleCategorySelect}
              />
          )}

          {step === STEPS.AGE && (
              <SingleSelect
                  options={['Jonger dan 18', '18 - 25 jaar', '26 - 65 jaar', 'Ouder dan 65']}
                  onSelect={handleAgeSelect}
              />
          )}

          {step === STEPS.CIRCUMSTANCES && (
              <MultiSelect
                  options={[
                    'Ik ben student', 'Ik heb kinderen', 'Ik heb een chronische ziekte',
                    'Ik heb huisdieren', 'Wil ik niet zeggen'
                  ]}
                  exclusiveOption="Wil ik niet zeggen"
                  onSubmit={handleCircumstancesSelect}
              />
          )}

          {step === STEPS.FREE_TEXT && (
              <FreeTextInput onSubmit={handleFreeTextSubmit} />
          )}

          {step === STEPS.FEEDBACK && (
              <div className="feedback-buttons">
                <p>Ben je tevreden met dit resultaat?</p>
                <button onClick={() => handleFeedback(true)}>Ja</button>
                <button onClick={() => handleFeedback(false)}>Nee, toon andere opties</button>
              </div>
          )}
        </div>
      </div>
  );
}

// --- HELPER COMPONENTS FOR UI ---

function SingleSelect({ options, onSelect }) {
  return (
      <div className="options-grid">
        {options.map(opt => (
            <button key={opt} onClick={() => onSelect(opt)} className="option-btn">
              {opt}
            </button>
        ))}
      </div>
  );
}

function MultiSelect({ options, onSubmit, exclusiveOption = null }) {
  const [selected, setSelected] = useState([]);

  const toggleOption = (opt) => {
    if (opt === exclusiveOption) {
      setSelected([opt]);
      return;
    }
    let newSelected = [...selected];
    if (newSelected.includes(exclusiveOption)) {
      newSelected = newSelected.filter(i => i !== exclusiveOption);
    }
    if (newSelected.includes(opt)) {
      newSelected = newSelected.filter(i => i !== opt);
    } else {
      newSelected.push(opt);
    }
    setSelected(newSelected);
  };

  return (
      <div className="multi-select-container">
        <div className="options-grid">
          {options.map(opt => (
              <button
                  key={opt}
                  className={`option-btn ${selected.includes(opt) ? 'selected' : ''}`}
                  onClick={() => toggleOption(opt)}
              >
                {opt}
              </button>
          ))}
        </div>
        <button
            className="submit-btn"
            disabled={selected.length === 0}
            onClick={() => onSubmit(selected)}
        >
          Bevestigen
        </button>
      </div>
  );
}

function FreeTextInput({ onSubmit }) {
  const [text, setText] = useState('');
  return (
      <div className="free-text-container">
      <textarea
          maxLength={300}
          placeholder="Beschrijf je situatie kort..."
          value={text}
          onChange={(e) => setText(e.target.value)}
      />
        <div className="char-count">{text.length}/300</div>
        <button
            className="submit-btn"
            disabled={text.trim().length === 0}
            onClick={() => onSubmit(text)}
        >
          Verstuur
        </button>
      </div>
  );
}