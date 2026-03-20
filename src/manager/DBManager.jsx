import { useState, createContext, useContext, useCallback } from "react";

const now = new Date();
const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString();
const monthsAgo = (m) => new Date(now.getTime() - m * 30 * 86400000).toISOString();

const initialLocations = [
    { location_id: "LOC001", name: "Buurthuis De Pijp", address: "Ferdinand Bolstraat 12", postcode: "1072 LJ", latitude: 52.3547, longitude: 4.8952, location_type: "Buurthuis", last_checked: daysAgo(1) },
    { location_id: "LOC002", name: "Wijkcentrum Oost", address: "Linnaeusstraat 89", postcode: "1093 EK", latitude: 52.3611, longitude: 4.9264, location_type: "Wijkcentrum", last_checked: daysAgo(2) },
    { location_id: "LOC003", name: "Gezondheidscentrum Centrum", address: "Nieuwezijds Voorburgwal 45", postcode: "1012 RD", latitude: 52.3738, longitude: 4.891, location_type: "Gezondheidscentrum", last_checked: daysAgo(3) },
    { location_id: "LOC004", name: "Bibliotheek Rotterdam Centraal", address: "Hoogstraat 110", postcode: "3011 PV", latitude: 51.9225, longitude: 4.4792, location_type: "Bibliotheek", last_checked: daysAgo(5) },
    { location_id: "LOC005", name: "Sociaal Loket Utrecht", address: "Stadsplateau 1", postcode: "3521 AZ", latitude: 52.0907, longitude: 5.1214, location_type: "Gemeentehuis", last_checked: daysAgo(4) },
    { location_id: "LOC006", name: "Sporthal Den Haag West", address: "Loosduinsekade 682", postcode: "2571 CT", latitude: 52.0705, longitude: 4.2744, location_type: "Sporthal", last_checked: daysAgo(10) },
    { location_id: "LOC007", name: "Voedselbank Eindhoven", address: "Hurksestraat 44", postcode: "5652 AJ", latitude: 51.4416, longitude: 5.4697, location_type: "Voedselbank", last_checked: daysAgo(6) },
    { location_id: "LOC008", name: "Jeugdhuis Groningen", address: "Oosterstraat 22", postcode: "9711 NV", latitude: 53.2194, longitude: 6.5665, location_type: "Jeugdhuis", last_checked: daysAgo(8) },
    { location_id: "LOC009", name: "Buurtcentrum Tilburg Noord", address: "Gasthuisring 201", postcode: "5041 DT", latitude: 51.5719, longitude: 5.0913, location_type: "Buurthuis", last_checked: daysAgo(12) },
    { location_id: "LOC010", name: "Zorgcentrum Almere Haven", address: "Binnenhaven 19", postcode: "1354 BA", latitude: 52.3476, longitude: 5.217, location_type: "Gezondheidscentrum", last_checked: daysAgo(15) },
];

const initialServices = [
    { service_id: "SRV001", name: "Schuldhulpverlening Amsterdam", category: "Hulp bij schulden", type: "Persoonlijke begeleiding", description: "Gratis hulp bij het oplossen van schulden en budgetbeheer", target_group: "Alle inwoners", income_requirement: "Geen", cost_to_user: "Gratis", access_type: "Op afspraak", location_id: "LOC001", availability: "Ma-Vr 9:00-17:00", phone: "020-1234567", email: "schuldhulp@amsterdam.nl", website: "https://amsterdam.nl/schuldhulp", needs_referral: false, keywords: "schulden, budget, financieel", notes: "Geen", last_checked: daysAgo(1), last_verified: daysAgo(30) },
    { service_id: "SRV002", name: "Huiswerkbegeleiding Basisschool", category: "Kinderen en opgroeien", type: "Groepsactiviteit", description: "Na-schoolse huiswerkbegeleiding voor kinderen van 8-12 jaar", target_group: "Kinderen 8-12 jaar", income_requirement: "Geen", cost_to_user: "€2 per sessie", access_type: "Inloop", location_id: "LOC002", availability: "Ma-Do 15:00-17:00", phone: "020-7654321", email: "huiswerk@wijkoost.nl", website: "Geen", needs_referral: false, keywords: "huiswerk, kinderen, school", notes: "Geen", last_checked: daysAgo(2), last_verified: daysAgo(60) },
    { service_id: "SRV003", name: "Spreekuur Huisarts zonder Afspraak", category: "Gezondheid en zorg", type: "Medische zorg", description: "Inloopspreekuur voor mensen zonder vaste huisarts", target_group: "Onverzekerde inwoners", income_requirement: "Geen", cost_to_user: "Gratis", access_type: "Inloop", location_id: "LOC003", availability: "Ma, Wo, Vr 10:00-12:00", phone: "020-9876543", email: "inloop@gezondheid.nl", website: "https://gezondheidscentrum.nl", needs_referral: false, keywords: "huisarts, gezondheid, inloop", notes: "Geen", last_checked: daysAgo(3), last_verified: monthsAgo(7) },
    { service_id: "SRV004", name: "Taalcursus Nederlands (A1-A2)", category: "Studeren en werken", type: "Cursus", description: "Basiscursus Nederlands voor nieuwkomers en anderstaligen", target_group: "Nieuwkomers", income_requirement: "Geen", cost_to_user: "€50 per cursus", access_type: "Registratie", location_id: "LOC004", availability: "Di, Do 18:00-20:00", phone: "010-1112233", email: "taal@rotterdam.nl", website: "https://taalcursus.rotterdam.nl", needs_referral: false, keywords: "taal, Nederlands, integratie, cursus", notes: "Geen", last_checked: daysAgo(5), last_verified: daysAgo(90) },
    { service_id: "SRV005", name: "Energiecoach aan Huis", category: "Wonen en energie besparen", type: "Huisbezoek", description: "Gratis advies over energiebesparing in uw woning", target_group: "Huurders en eigenaren", income_requirement: "Geen", cost_to_user: "Gratis", access_type: "Op afspraak", location_id: "LOC005", availability: "Ma-Vr 9:00-17:00", phone: "030-4445566", email: "energie@utrecht.nl", website: "https://utrecht.nl/energie", needs_referral: false, keywords: "energie, besparen, wonen, duurzaam", notes: "Geen", last_checked: daysAgo(4), last_verified: daysAgo(20) },
    { service_id: "SRV006", name: "Gratis Sportlessen 65+", category: "Gezondheid en zorg", type: "Groepsactiviteit", description: "Wekelijkse sportlessen voor senioren", target_group: "65-plussers", income_requirement: "Geen", cost_to_user: "Gratis", access_type: "Inloop", location_id: "LOC006", availability: "Wo 10:00-11:30", phone: "070-5556677", email: "sport@denhaag.nl", website: "Geen", needs_referral: false, keywords: "sport, senioren, bewegen, gezondheid", notes: "Geen", last_checked: daysAgo(10), last_verified: monthsAgo(8) },
    { service_id: "SRV007", name: "Voedselpakket Uitgifte", category: "Onkosten en dagelijks leven", type: "Uitgifte", description: "Wekelijks voedselpakket voor gezinnen met laag inkomen", target_group: "Gezinnen onder bijstandsnorm", income_requirement: "Onder bijstandsnorm", cost_to_user: "Gratis", access_type: "Verwijzing", location_id: "LOC007", availability: "Za 10:00-12:00", phone: "040-8889900", email: "voedsel@eindhoven.nl", website: "https://voedselbank.nl/eindhoven", needs_referral: true, keywords: "voedsel, voedselbank, armoede", notes: "Verwijzing via maatschappelijk werk", last_checked: daysAgo(6), last_verified: daysAgo(45) },
    { service_id: "SRV008", name: "Jongerencoach (12-18 jaar)", category: "Kinderen en opgroeien", type: "Persoonlijke begeleiding", description: "Coaching en mentoring voor jongeren met schoolproblemen", target_group: "Jongeren 12-18 jaar", income_requirement: "Geen", cost_to_user: "Gratis", access_type: "Verwijzing", location_id: "LOC008", availability: "Ma-Vr 13:00-17:00", phone: "050-1122334", email: "jongerencoach@groningen.nl", website: "Geen", needs_referral: true, keywords: "jongeren, coaching, school, mentor", notes: "Verwijzing via school of huisarts", last_checked: daysAgo(8), last_verified: monthsAgo(5) },
    { service_id: "SRV009", name: "Budgetcursus voor Gezinnen", category: "Hulp bij schulden", type: "Cursus", description: "Leer omgaan met geld en voorkom schulden", target_group: "Gezinnen", income_requirement: "Geen", cost_to_user: "Gratis", access_type: "Registratie", location_id: "LOC009", availability: "Di 19:00-21:00", phone: "013-2233445", email: "budget@tilburg.nl", website: "https://tilburg.nl/budgetcursus", needs_referral: false, keywords: "budget, schulden, cursus, gezin", notes: "Geen", last_checked: daysAgo(12), last_verified: daysAgo(100) },
    { service_id: "SRV010", name: "Mantelzorgondersteuning", category: "Gezondheid en zorg", type: "Persoonlijke begeleiding", description: "Ondersteuning en respijtzorg voor mantelzorgers", target_group: "Mantelzorgers", income_requirement: "Geen", cost_to_user: "Gratis", access_type: "Op afspraak", location_id: "LOC010", availability: "Ma-Vr 9:00-17:00", phone: "036-5566778", email: "mantelzorg@almere.nl", website: "https://almere.nl/mantelzorg", needs_referral: false, keywords: "mantelzorg, respijt, ondersteuning", notes: "Geen", last_checked: daysAgo(15), last_verified: monthsAgo(9) },
    { service_id: "SRV011", name: "Huurtoeslagadvies", category: "Onkosten en dagelijks leven", type: "Advies", description: "Hulp bij het aanvragen van huurtoeslag", target_group: "Huurders", income_requirement: "Tot modaal", cost_to_user: "Gratis", access_type: "Op afspraak", location_id: "LOC005", availability: "Di, Do 10:00-15:00", phone: "030-7788990", email: "toeslag@utrecht.nl", website: "Geen", needs_referral: false, keywords: "huurtoeslag, toeslagen, huur", notes: "Geen", last_checked: daysAgo(3), last_verified: daysAgo(150) },
    { service_id: "SRV012", name: "Sollicitatietraining", category: "Studeren en werken", type: "Workshop", description: "Training in solliciteren, CV schrijven en netwerken", target_group: "Werkzoekenden", income_requirement: "Geen", cost_to_user: "Gratis", access_type: "Registratie", location_id: "LOC004", availability: "Vr 13:00-16:00", phone: "010-3344556", email: "werk@rotterdam.nl", website: "https://rotterdam.nl/werk", needs_referral: false, keywords: "sollicitatie, werk, CV, training", notes: "Geen", last_checked: daysAgo(2), last_verified: daysAgo(80) },
    { service_id: "SRV013", name: "Warmtefonds Aanvraag", category: "Wonen en energie besparen", type: "Subsidie", description: "Financiële steun voor woningisolatie", target_group: "Huiseigenaren", income_requirement: "Tot 1.5x modaal", cost_to_user: "Gratis", access_type: "Online", location_id: "LOC005", availability: "Online beschikbaar", phone: "Geen", email: "warmtefonds@utrecht.nl", website: "https://warmtefonds.nl", needs_referral: false, keywords: "isolatie, subsidie, energie, woning", notes: "Geen", last_checked: daysAgo(7), last_verified: daysAgo(40) },
    { service_id: "SRV014", name: "Peuterspeelzaal De Vlinder", category: "Kinderen en opgroeien", type: "Dagopvang", description: "Speelzaal voor peuters van 2-4 jaar", target_group: "Peuters 2-4 jaar", income_requirement: "Geen", cost_to_user: "€8 per dagdeel", access_type: "Registratie", location_id: "LOC001", availability: "Ma-Vr 8:30-12:30", phone: "020-6677889", email: "vlinder@amsterdam.nl", website: "Geen", needs_referral: false, keywords: "peuter, speelzaal, kinderopvang", notes: "Geen", last_checked: daysAgo(9), last_verified: monthsAgo(4) },
    { service_id: "SRV015", name: "GGZ Inloopspreekuur", category: "Gezondheid en zorg", type: "Medische zorg", description: "Laagdrempelig spreekuur voor psychische klachten", target_group: "Alle inwoners", income_requirement: "Geen", cost_to_user: "Gratis", access_type: "Inloop", location_id: "LOC003", availability: "Do 14:00-16:00", phone: "020-0011223", email: "ggz@amsterdam.nl", website: "https://ggzinloop.nl", needs_referral: false, keywords: "ggz, psychisch, inloop, geestelijk", notes: "Geen", last_checked: daysAgo(1), last_verified: daysAgo(10) },
];

const DataContext = createContext(null);
const useData = () => useContext(DataContext);

const DataProvider = ({ children }) => {
    const [locations, setLocations] = useState(initialLocations);
    const [services, setServices] = useState(initialServices);

    const addLocation = useCallback((loc) => {
        setLocations(prev => {
            const nums = prev.map(l => parseInt(l.location_id.replace("LOC", ""), 10));
            const next = Math.max(...nums, 0) + 1;
            return [...prev, { ...loc, location_id: `LOC${String(next).padStart(3, "0")}`, last_checked: new Date().toISOString() }];
        });
    }, []);

    const updateLocation = useCallback((loc) => {
        setLocations(prev => prev.map(l => l.location_id === loc.location_id ? { ...loc, last_checked: new Date().toISOString() } : l));
    }, []);

    const addService = useCallback((svc) => {
        setServices(prev => {
            const nums = prev.map(s => parseInt(s.service_id.replace("SRV", ""), 10));
            const next = Math.max(...nums, 0) + 1;
            return [...prev, { ...svc, service_id: `SRV${String(next).padStart(3, "0")}`, last_checked: new Date().toISOString(), last_verified: new Date().toISOString() }];
        });
    }, []);

    const updateService = useCallback((svc) => {
        setServices(prev => prev.map(s => s.service_id === svc.service_id ? { ...svc, last_checked: new Date().toISOString(), last_verified: new Date().toISOString() } : s));
    }, []);

    const verifyService = useCallback((id) => {
        setServices(prev => prev.map(s => s.service_id === id ? { ...s, last_verified: new Date().toISOString() } : s));
    }, []);

    return (
        <DataContext.Provider value={{ locations, services, addLocation, updateLocation, addService, updateService, verifyService }}>
            {children}
        </DataContext.Provider>
    );
};

// ——— Shared helpers ———
const formatDate = (iso) => {
    const d = new Date(iso), now2 = new Date();
    const diffMs = now2 - d, diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min geleden`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} uur geleden`;
    return `${Math.floor(diffHours / 24)} dagen geleden`;
};

const SIX_MONTHS = 6 * 30 * 86400000;
const isStale = (svc) => Date.now() - (svc.last_verified ? new Date(svc.last_verified).getTime() : 0) > SIX_MONTHS;

const categoryColors = {
    "Onkosten en dagelijks leven": { bg: "#FEF3C7", text: "#92400E" },
    "Kinderen en opgroeien": { bg: "#FEE2E2", text: "#991B1B" },
    "Gezondheid en zorg": { bg: "#D1FAE5", text: "#065F46" },
    "Studeren en werken": { bg: "#DBEAFE", text: "#1E40AF" },
    "Wonen en energie besparen": { bg: "#EDE9FE", text: "#5B21B6" },
    "Hulp bij schulden": { bg: "#F1F5F9", text: "#1E293B" },
};

const accessColors = {
    "Op afspraak": { bg: "#EEF2FF", text: "#3730A3" },
    "Inloop": { bg: "#ECFDF5", text: "#065F46" },
    "Registratie": { bg: "#F5F3FF", text: "#6D28D9" },
    "Verwijzing": { bg: "#FFF1F2", text: "#9F1239" },
    "Online": { bg: "#F0F9FF", text: "#0C4A6E" },
};

const locTypeColors = {
    Buurthuis: { bg: "#DBEAFE", text: "#1E40AF" },
    Wijkcentrum: { bg: "#D1FAE5", text: "#065F46" },
    Gezondheidscentrum: { bg: "#FEE2E2", text: "#991B1B" },
    Bibliotheek: { bg: "#FEF3C7", text: "#92400E" },
    Gemeentehuis: { bg: "#EDE9FE", text: "#5B21B6" },
    Sporthal: { bg: "#ECFDF5", text: "#065F46" },
    Voedselbank: { bg: "#FFF7ED", text: "#9A3412" },
    Jeugdhuis: { bg: "#FDF4FF", text: "#7E22CE" },
};

const Badge = ({ label, style }) => (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap", ...style }}>{label}</span>
);

const CategoryBadge = ({ cat }) => {
    const c = categoryColors[cat] || { bg: "#F1F5F9", text: "#1E293B" };
    return <Badge label={cat} style={{ background: c.bg, color: c.text }} />;
};

const AccessBadge = ({ at }) => {
    const c = accessColors[at] || { bg: "#F1F5F9", text: "#334155" };
    return <Badge label={at} style={{ background: c.bg, color: c.text }} />;
};

const LocTypeBadge = ({ lt }) => {
    const c = locTypeColors[lt] || { bg: "#F1F5F9", text: "#334155" };
    return <Badge label={lt} style={{ background: c.bg, color: c.text }} />;
};

// ——— Modal Dialog ———
const Modal = ({ open, onClose, title, children, wide }) => {
    if (!open) return null;
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
             onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={{ background: "var(--color-background-primary)", borderRadius: 12, border: "0.5px solid var(--color-border-tertiary)", width: "100%", maxWidth: wide ? 720 : 520, maxHeight: "90vh", overflow: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{title}</span>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1, color: "var(--color-text-secondary)", padding: "0 4px" }}>×</button>
                </div>
                <div style={{ padding: "20px" }}>{children}</div>
            </div>
        </div>
    );
};

const Field = ({ label, children }) => (
    <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>{label}</label>
        {children}
    </div>
);

const Input = ({ value, onChange, placeholder, type = "text" }) => (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
           style={{ width: "100%", boxSizing: "border-box", height: 34, padding: "0 10px", fontSize: 13, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }} />
);

const Select = ({ value, onChange, options }) => (
    <select value={value} onChange={e => onChange(e.target.value)}
            style={{ width: "100%", height: 34, padding: "0 10px", fontSize: 13, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
);

const Textarea = ({ value, onChange, rows = 3 }) => (
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
              style={{ width: "100%", boxSizing: "border-box", padding: "6px 10px", fontSize: 13, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none", resize: "vertical" }} />
);

const Btn = ({ onClick, variant = "primary", children, small }) => {
    const base = { border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" };
    const styles = {
        primary: { ...base, background: "#1E293B", color: "#fff", padding: small ? "5px 12px" : "7px 16px", fontSize: small ? 12 : 13 },
        secondary: { ...base, background: "transparent", color: "var(--color-text-primary)", border: "0.5px solid var(--color-border-secondary)", padding: small ? "5px 12px" : "7px 16px", fontSize: small ? 12 : 13 },
        danger: { ...base, background: "#FEE2E2", color: "#991B1B", border: "0.5px solid #FECACA", padding: small ? "5px 12px" : "7px 16px", fontSize: small ? 12 : 13 },
    };
    return <button onClick={onClick} style={styles[variant]}>{children}</button>;
};

// ——— Location Form ———
const LocationForm = ({ loc, onSave, onClose }) => {
    const empty = { name: "", address: "", postcode: "", latitude: "", longitude: "", location_type: "Buurthuis" };
    const [form, setForm] = useState(loc ? { ...loc } : empty);
    const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
    const typeOpts = ["Buurthuis", "Wijkcentrum", "Gezondheidscentrum", "Bibliotheek", "Gemeentehuis", "Sporthal", "Voedselbank", "Jeugdhuis"].map(t => ({ value: t, label: t }));

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ gridColumn: "1 / -1" }}><Field label="Naam"><Input value={form.name} onChange={set("name")} placeholder="Naam locatie" /></Field></div>
                <div style={{ gridColumn: "1 / -1" }}><Field label="Adres"><Input value={form.address} onChange={set("address")} placeholder="Straat + huisnummer" /></Field></div>
                <Field label="Postcode"><Input value={form.postcode} onChange={set("postcode")} placeholder="1234 AB" /></Field>
                <Field label="Type"><Select value={form.location_type} onChange={set("location_type")} options={typeOpts} /></Field>
                <Field label="Breedtegraad"><Input value={form.latitude} onChange={set("latitude")} placeholder="52.0907" /></Field>
                <Field label="Lengtegraad"><Input value={form.longitude} onChange={set("longitude")} placeholder="5.1214" /></Field>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <Btn variant="secondary" onClick={onClose}>Annuleren</Btn>
                <Btn onClick={() => { onSave(form); onClose(); }}>Opslaan</Btn>
            </div>
        </div>
    );
};

// ——— Service Form ———
const ServiceForm = ({ svc, locations, onSave, onClose }) => {
    const empty = { name: "", category: "Gezondheid en zorg", type: "Advies", description: "", target_group: "", income_requirement: "Geen", cost_to_user: "Gratis", access_type: "Inloop", location_id: locations[0]?.location_id || "", availability: "", phone: "", email: "", website: "", needs_referral: false, keywords: "", notes: "" };
    const [form, setForm] = useState(svc ? { ...svc } : empty);
    const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

    const cats = ["Hulp bij schulden", "Kinderen en opgroeien", "Gezondheid en zorg", "Studeren en werken", "Wonen en energie besparen", "Onkosten en dagelijks leven"].map(c => ({ value: c, label: c }));
    const types = ["Advies", "Cursus", "Dagopvang", "Groepsactiviteit", "Huisbezoek", "Medische zorg", "Persoonlijke begeleiding", "Subsidie", "Uitgifte", "Workshop"].map(t => ({ value: t, label: t }));
    const accesses = ["Inloop", "Op afspraak", "Online", "Registratie", "Verwijzing"].map(a => ({ value: a, label: a }));
    const locOpts = locations.map(l => ({ value: l.location_id, label: `${l.location_id} — ${l.name}` }));

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ gridColumn: "1 / -1" }}><Field label="Naam dienst"><Input value={form.name} onChange={set("name")} placeholder="Naam van de dienst" /></Field></div>
                <Field label="Categorie"><Select value={form.category} onChange={set("category")} options={cats} /></Field>
                <Field label="Type"><Select value={form.type} onChange={set("type")} options={types} /></Field>
                <div style={{ gridColumn: "1 / -1" }}><Field label="Omschrijving"><Textarea value={form.description} onChange={set("description")} /></Field></div>
                <Field label="Doelgroep"><Input value={form.target_group} onChange={set("target_group")} placeholder="bijv. Alle inwoners" /></Field>
                <Field label="Inkomensvereiste"><Input value={form.income_requirement} onChange={set("income_requirement")} placeholder="bijv. Geen" /></Field>
                <Field label="Kosten gebruiker"><Input value={form.cost_to_user} onChange={set("cost_to_user")} placeholder="bijv. Gratis" /></Field>
                <Field label="Toegangstype"><Select value={form.access_type} onChange={set("access_type")} options={accesses} /></Field>
                <div style={{ gridColumn: "1 / -1" }}><Field label="Locatie"><Select value={form.location_id} onChange={set("location_id")} options={locOpts} /></Field></div>
                <Field label="Beschikbaarheid"><Input value={form.availability} onChange={set("availability")} placeholder="bijv. Ma-Vr 9:00-17:00" /></Field>
                <Field label="Telefoon"><Input value={form.phone} onChange={set("phone")} placeholder="010-1234567" /></Field>
                <Field label="E-mail"><Input value={form.email} onChange={set("email")} placeholder="info@..." /></Field>
                <Field label="Website"><Input value={form.website} onChange={set("website")} placeholder="https://..." /></Field>
                <div style={{ gridColumn: "1 / -1" }}><Field label="Trefwoorden"><Input value={form.keywords} onChange={set("keywords")} placeholder="bijv. schulden, budget, financieel" /></Field></div>
                <div style={{ gridColumn: "1 / -1" }}><Field label="Notities"><Textarea value={form.notes} onChange={set("notes")} rows={2} /></Field></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" id="ref" checked={form.needs_referral} onChange={e => set("needs_referral")(e.target.checked)} />
                    <label htmlFor="ref" style={{ fontSize: 13, color: "var(--color-text-primary)" }}>Verwijzing nodig</label>
                </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <Btn variant="secondary" onClick={onClose}>Annuleren</Btn>
                <Btn onClick={() => { onSave(form); onClose(); }}>Opslaan</Btn>
            </div>
        </div>
    );
};

// ——— Pages ———
const OverviewPage = () => {
    const { locations, services } = useData();
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const recentChanges = [...locations, ...services].filter(r => new Date(r.last_checked) >= sevenDaysAgo).length;
    const staleCount = services.filter(isStale).length;

    const recent = [...locations.map(l => ({ id: l.location_id, name: l.name, type: "Locatie", last_checked: l.last_checked })),
        ...services.map(s => ({ id: s.service_id, name: s.name, type: "Dienst", last_checked: s.last_checked }))]
        .sort((a, b) => new Date(b.last_checked) - new Date(a.last_checked)).slice(0, 6);

    const stats = [
        { label: "Totaal Locaties", value: locations.length, sub: "In de database" },
        { label: "Totaal Diensten", value: services.length, sub: "Beschikbare services" },
        { label: "Updates (7 dagen)", value: recentChanges, sub: "Recente wijzigingen" },
        { label: "Verlopen verificaties", value: staleCount, sub: "Ouder dan 6 maanden", warn: staleCount > 0 },
    ];

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 4px" }}>Overview</h1>
                <p style={{ color: "var(--color-text-secondary)", fontSize: 13, margin: 0 }}>Welkom terug, Admin. Hier is een overzicht van uw database.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                {stats.map(s => (
                    <div key={s.label} style={{ background: s.warn ? "#FFF7ED" : "var(--color-background-secondary)", borderRadius: 8, padding: "14px 16px" }}>
                        <div style={{ fontSize: 12, color: s.warn ? "#9A3412" : "var(--color-text-secondary)", marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 500, color: s.warn ? "#C2410C" : "var(--color-text-primary)" }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: s.warn ? "#EA580C" : "var(--color-text-tertiary)" }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Recente activiteit</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                    <tr style={{ background: "var(--color-background-secondary)" }}>
                        {["ID", "Naam", "Type", "Gecontroleerd"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {recent.map(r => (
                        <tr key={r.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                            <td style={{ padding: "9px 14px", fontFamily: "monospace", fontSize: 12 }}>{r.id}</td>
                            <td style={{ padding: "9px 14px", fontWeight: 500 }}>{r.name}</td>
                            <td style={{ padding: "9px 14px" }}>
                                <Badge label={r.type} style={{ background: r.type === "Locatie" ? "#DBEAFE" : "#EDE9FE", color: r.type === "Locatie" ? "#1E40AF" : "#5B21B6" }} />
                            </td>
                            <td style={{ padding: "9px 14px", color: "var(--color-text-secondary)" }}>{formatDate(r.last_checked)}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const LocationsPage = () => {
    const { locations, addLocation, updateLocation } = useData();
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editLoc, setEditLoc] = useState(null);

    const types = [...new Set(locations.map(l => l.location_type))].sort();
    const filtered = locations.filter(l => {
        if (filterType !== "all" && l.location_type !== filterType) return false;
        if (search) {
            const q = search.toLowerCase();
            return [l.name, l.location_id, l.address, l.postcode, l.location_type].join(" ").toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 2px" }}>Locaties</h1>
                    <p style={{ color: "var(--color-text-secondary)", fontSize: 13, margin: 0 }}>Beheer alle locaties in de database</p>
                </div>
                <Btn onClick={() => { setEditLoc(null); setDialogOpen(true); }}>+ Nieuwe locatie</Btn>
            </div>

            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 10, padding: 14, borderBottom: "0.5px solid var(--color-border-tertiary)", flexWrap: "wrap" }}>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek locatie..."
                           style={{ flex: 1, minWidth: 160, height: 32, padding: "0 10px", fontSize: 13, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none" }} />
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                            style={{ height: 32, padding: "0 8px", fontSize: 13, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}>
                        <option value="all">Alle types</option>
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                        <tr style={{ background: "var(--color-background-secondary)" }}>
                            {["ID", "Naam", "Adres", "Postcode", "Type", "Gecontroleerd"].map(h => (
                                <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>{h}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map(l => (
                            <tr key={l.location_id} onClick={() => { setEditLoc(l); setDialogOpen(true); }}
                                style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", cursor: "pointer" }}
                                onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                                onMouseLeave={e => e.currentTarget.style.background = ""}>
                                <td style={{ padding: "9px 12px", fontFamily: "monospace", fontSize: 12 }}>{l.location_id}</td>
                                <td style={{ padding: "9px 12px", fontWeight: 500 }}>{l.name}</td>
                                <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)" }}>{l.address}</td>
                                <td style={{ padding: "9px 12px", fontFamily: "monospace", fontSize: 12 }}>{l.postcode}</td>
                                <td style={{ padding: "9px 12px" }}><LocTypeBadge lt={l.location_type} /></td>
                                <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)" }}>{formatDate(l.last_checked)}</td>
                            </tr>
                        ))}
                        {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: "24px 12px", textAlign: "center", color: "var(--color-text-secondary)" }}>Geen locaties gevonden</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding: "10px 14px", borderTop: "0.5px solid var(--color-border-tertiary)", fontSize: 12, color: "var(--color-text-secondary)" }}>{filtered.length} locaties</div>
            </div>

            <Modal open={dialogOpen} onClose={() => setDialogOpen(false)} title={editLoc ? "Locatie bewerken" : "Nieuwe locatie"}>
                <LocationForm loc={editLoc} onClose={() => setDialogOpen(false)}
                              onSave={form => editLoc ? updateLocation(form) : addLocation(form)} />
            </Modal>
        </div>
    );
};

const ServicesPage = () => {
    const { services, locations, addService, updateService, verifyService } = useData();
    const [search, setSearch] = useState("");
    const [filterCat, setFilterCat] = useState("all");
    const [filterAccess, setFilterAccess] = useState("all");
    const [page, setPage] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editSvc, setEditSvc] = useState(null);
    const PER_PAGE = 8;

    const cats = [...new Set(services.map(s => s.category))].sort();
    const accesses = [...new Set(services.map(s => s.access_type))].sort();

    const filtered = services.filter(s => {
        if (filterCat !== "all" && s.category !== filterCat) return false;
        if (filterAccess !== "all" && s.access_type !== filterAccess) return false;
        if (search) {
            const q = search.toLowerCase();
            return [s.name, s.service_id, s.category, s.type, s.target_group, s.keywords].join(" ").toLowerCase().includes(q);
        }
        return true;
    });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 2px" }}>Diensten</h1>
                    <p style={{ color: "var(--color-text-secondary)", fontSize: 13, margin: 0 }}>Beheer alle diensten in de database</p>
                </div>
                <Btn onClick={() => { setEditSvc(null); setDialogOpen(true); }}>+ Nieuwe dienst</Btn>
            </div>

            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 10, padding: 14, borderBottom: "0.5px solid var(--color-border-tertiary)", flexWrap: "wrap" }}>
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Zoek op naam, ID, trefwoord..."
                           style={{ flex: 1, minWidth: 180, height: 32, padding: "0 10px", fontSize: 13, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", outline: "none" }} />
                    <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(0); }}
                            style={{ height: 32, padding: "0 8px", fontSize: 13, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}>
                        <option value="all">Alle categorieën</option>
                        {cats.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={filterAccess} onChange={e => { setFilterAccess(e.target.value); setPage(0); }}
                            style={{ height: 32, padding: "0 8px", fontSize: 13, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)" }}>
                        <option value="all">Alle toegang</option>
                        {accesses.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                        <tr style={{ background: "var(--color-background-secondary)" }}>
                            {["", "Naam", "Categorie", "Type", "Kosten", "Toegang", "Locatie", "Gecontroleerd"].map((h, i) => (
                                <th key={i} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {paged.map(s => (
                            <tr key={s.service_id} onClick={() => { setEditSvc(s); setDialogOpen(true); }}
                                style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", cursor: "pointer" }}
                                onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"}
                                onMouseLeave={e => e.currentTarget.style.background = ""}>
                                <td style={{ padding: "8px 10px 8px 14px", width: 24 }}>
                                    {isStale(s) ? (
                                        <button onClick={e => { e.stopPropagation(); verifyService(s.service_id); }}
                                                title="Verificatie verlopen — klik om te bevestigen"
                                                style={{ background: "#FEE2E2", border: "none", borderRadius: 4, width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#991B1B" }}>!</button>
                                    ) : (
                                        <span style={{ color: "#16A34A", fontSize: 14 }}>✓</span>
                                    )}
                                </td>
                                <td style={{ padding: "8px 12px" }}>
                                    <div style={{ fontWeight: 500 }}>{s.name}</div>
                                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--color-text-secondary)" }}>{s.service_id}</div>
                                </td>
                                <td style={{ padding: "8px 12px" }}><CategoryBadge cat={s.category} /></td>
                                <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)" }}>{s.type}</td>
                                <td style={{ padding: "8px 12px" }}>{s.cost_to_user}</td>
                                <td style={{ padding: "8px 12px" }}><AccessBadge at={s.access_type} /></td>
                                <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 12 }}>{s.location_id}</td>
                                <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)" }}>{formatDate(s.last_checked)}</td>
                            </tr>
                        ))}
                        {paged.length === 0 && <tr><td colSpan={8} style={{ padding: "24px 12px", textAlign: "center", color: "var(--color-text-secondary)" }}>Geen diensten gevonden</td></tr>}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{filtered.length} resultaten</span>
                    {totalPages > 1 && (
                        <div style={{ display: "flex", gap: 4 }}>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button key={i} onClick={() => setPage(i)}
                                        style={{ width: 28, height: 28, borderRadius: 6, border: `0.5px solid ${i === page ? "#1E293B" : "var(--color-border-secondary)"}`, background: i === page ? "#1E293B" : "transparent", color: i === page ? "#fff" : "var(--color-text-primary)", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>{i + 1}</button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Modal open={dialogOpen} onClose={() => setDialogOpen(false)} title={editSvc ? "Dienst bewerken" : "Nieuwe dienst"} wide>
                <ServiceForm svc={editSvc} locations={locations} onClose={() => setDialogOpen(false)}
                             onSave={form => editSvc ? updateService(form) : addService(form)} />
            </Modal>
        </div>
    );
};

// ——— Login Page ———
const LoginPage = ({ onLogin }) => {
    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const [showPass, setShowPass] = useState(false);

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-background-secondary)", padding: 16 }}>
            <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, width: "100%", maxWidth: 380, padding: 32 }}>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                    <div style={{ width: 44, height: 44, background: "#1E293B", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 20 }}>
                        <span style={{ color: "#fff", fontSize: 18 }}>⬡</span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 4px" }}>DBAdmin</h2>
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>Meld u aan om het beheerpaneel te openen</p>
                </div>
                <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>Gebruikersnaam</label>
                    <input value={user} onChange={e => setUser(e.target.value)} placeholder="admin"
                           style={{ width: "100%", boxSizing: "border-box", height: 36, padding: "0 10px", fontSize: 13, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>Wachtwoord</label>
                    <div style={{ position: "relative" }}>
                        <input type={showPass ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
                               style={{ width: "100%", boxSizing: "border-box", height: 36, padding: "0 36px 0 10px", fontSize: 13, borderRadius: 6, border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", outline: "none" }} />
                        <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 13 }}>{showPass ? "🙈" : "👁"}</button>
                    </div>
                </div>
                <button onClick={onLogin} style={{ width: "100%", height: 36, background: "#1E293B", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Inloggen</button>
            </div>
        </div>
    );
};

// ——— Main App ———
export default function App() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [page, setPage] = useState("overview");

    if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;

    const navItems = [
        { id: "overview", label: "Overview", icon: "⊞" },
        { id: "locations", label: "Locaties", icon: "◎" },
        { id: "services", label: "Diensten", icon: "◈" },
    ];

    return (
        <DataProvider>
            <div style={{ display: "flex", height: "100vh", fontFamily: "var(--font-sans)", fontSize: 13, background: "var(--color-background-tertiary)" }}>
                {/* Sidebar */}
                <div style={{ width: 220, flexShrink: 0, background: "var(--color-background-primary)", borderRight: "0.5px solid var(--color-border-tertiary)", display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "16px 16px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, background: "#1E293B", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", flexShrink: 0 }}>⬡</div>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>DBAdmin</span>
                    </div>
                    <nav style={{ flex: 1, padding: "12px 8px" }}>
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => setPage(item.id)}
                                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 6, border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, marginBottom: 2,
                                        background: page === item.id ? "#F1F5F9" : "transparent",
                                        color: page === item.id ? "#1E293B" : "var(--color-text-secondary)",
                                        fontWeight: page === item.id ? 500 : 400 }}>
                                <span style={{ fontSize: 15 }}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                    </nav>
                    <div style={{ padding: "12px 16px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 28, height: 28, background: "#1E293B", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 500 }}>A</div>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>Admin User</div>
                                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>admin@dbadmin.nl</div>
                            </div>
                        </div>
                        <button onClick={() => setLoggedIn(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: 14 }} title="Uitloggen">↩</button>
                    </div>
                </div>

                {/* Main */}
                <div style={{ flex: 1, overflow: "auto" }}>
                    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px" }}>
                        {page === "overview" && <OverviewPage />}
                        {page === "locations" && <LocationsPage />}
                        {page === "services" && <ServicesPage />}
                    </div>
                </div>
            </div>
        </DataProvider>
    );
}