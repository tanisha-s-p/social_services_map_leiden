import { useState, createContext, useContext, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";



const T = {
    bg:            "#f7f4ef",
    surface:       "#ffffff",
    surface2:      "#f0ede8",
    border:        "#ddd8cf",
    textPrimary:   "#1a1714",
    textSecondary: "#5c5650",
    textMuted:     "#9e9890",
    accent:        "#c8421e",
    accentLight:   "#fdf0ec",
    radiusSm:      "6px",
    radiusMd:      "12px",
    radiusLg:      "20px",
    shadowSm:      "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
    shadowMd:      "0 4px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)",
    shadowLg:      "0 12px 40px rgba(0,0,0,0.14)",
    fontDisplay:   "'Outfit', system-ui, sans-serif",
    fontBody:      "'Outfit', system-ui, sans-serif",
};

const GOOGLE_FONTS = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap";

const categoryColors = {
    "Onkosten en dagelijks leven": { bg: "#fef3e7", text: "#7a4810" },
    "Kinderen en opgroeien":       { bg: "#fdeeed", text: "#8b2218" },
    "Gezondheid en zorg":          { bg: "#e8f4fb", text: "#1e5f80" },
    "Studeren en werken":          { bg: "#f5ecfb", text: "#6b2e8a" },
    "Wonen en energie besparen":   { bg: "#eef7dd", text: "#3d5c10" },
    "Hulp bij schulden":           { bg: "#ede8f5", text: "#3d1f6b" },
};

const accessColors = {
    "Op afspraak":   { bg: "#ede8f5", text: "#3d1f6b" },
    "Inloop":        { bg: "#eef7dd", text: "#3d5c10" },
    "Registratie":   { bg: "#f5ecfb", text: "#6b2e8a" },
    "Verwijzing":    { bg: "#fdf0ec", text: "#c8421e" },
    "Online":        { bg: "#e8f4fb", text: "#1e5f80" },
    "walkin":        { bg: "#eef7dd", text: "#3d5c10" },
    "appointment":   { bg: "#ede8f5", text: "#3d1f6b" },
    "phone":         { bg: "#e8f4fb", text: "#1e5f80" },
    "home_visit":    { bg: "#fef3e7", text: "#7a4810" },
    "online":        { bg: "#e8f4fb", text: "#1e5f80" },
    "referral_only": { bg: "#fdf0ec", text: "#c8421e" },
};

const locTypeColors = {
    Buurthuis:          { bg: "#e8f4fb", text: "#1e5f80" },
    Wijkcentrum:        { bg: "#eef7dd", text: "#3d5c10" },
    Gezondheidscentrum: { bg: "#fdeeed", text: "#8b2218" },
    Bibliotheek:        { bg: "#f0ede8", text: "#4a3f35" },
    Gemeentehuis:       { bg: "#ede8f5", text: "#3d1f6b" },
    Sporthal:           { bg: "#eef7dd", text: "#3d5c10" },
    Voedselbank:        { bg: "#fef3e7", text: "#7a4810" },
    Jeugdhuis:          { bg: "#f5ecfb", text: "#6b2e8a" },
    government:         { bg: "#e4efe3", text: "#1e3d1b" },
    organization:       { bg: "#e5eaff", text: "#1a2eaa" },
    hub:                { bg: "#fdf5d6", text: "#6b5000" },
};


const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const values = [];
        let current = '', inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') { inQuotes = !inQuotes; }
            else if (char === ',' && !inQuotes) { values.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
            else { current += char; }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((header, idx) => { row[header] = values[idx] || ''; });
        rows.push(row);
    }
    return rows;
};

const csvToLocations = (csvText) =>
    parseCSV(csvText).map(row => ({
        location_id:     row.location_id || row.id || '',
        name:            row.name || '',
        address:         row.address || '',
        postcode:        row.postcode || '',
        latitude:        parseFloat(row.latitude) || 0,
        longitude:       parseFloat(row.longitude) || 0,
        location_type:   row.location_type || row.type || 'Buurthuis',
        google_map_link: row.google_map_link || '',
        last_checked:    row.last_checked || new Date().toISOString(),
    })).filter(l => l.location_id && l.name);

const csvToServices = (csvText) =>
    parseCSV(csvText).map(row => ({
        service_id:         row.service_id || row.id || '',
        name:               row.name || '',
        category:           row.category || 'Gezondheid en zorg',
        type:               row.type || 'Advies',
        description:        row.description || '',
        target_group:       row.target_group || '',
        income_requirement: row.income_requirement || 'Geen',
        cost_to_user:       row.cost_to_user || 'Gratis',
        access_type:        row.access_type || 'Inloop',
        location_id:        row.location_id || '',
        availability:       row.availability || '',
        phone:              row.phone || '',
        email:              row.email || '',
        website:            row.website || '',
        keywords:           row.keywords || '',
        notes:              row.notes || '',
        needs_referral:     row.needs_referral === 'Yes' || row.needs_referral === 'true' || row.needs_referral === '1' || false,
        last_checked:       row.last_checked || new Date().toISOString(),
        last_verified:      row.last_verified || new Date().toISOString(),
    })).filter(s => s.service_id && s.name);

const loadCSVFile = async (filename) => {
    try {
        const response = await fetch(`/${filename}`);
        if (!response.ok) throw new Error(`Failed to load ${filename}`);
        return await response.text();
    } catch (error) {
        console.error(`Error loading CSV file ${filename}:`, error);
        return '';
    }
};

const loadInitialData = async () => {
    const [locationsCSV, servicesCSV] = await Promise.all([
        loadCSVFile('locations.csv'),
        loadCSVFile('services.csv'),
    ]);
    return {
        locations: csvToLocations(locationsCSV),
        services:  csvToServices(servicesCSV),
    };
};

const DataContext = createContext(null);
const useData = () => useContext(DataContext);

const DataProvider = ({ children, initialData }) => {
    const [locations, setLocations] = useState(initialData?.locations || []);
    const [services,  setServices]  = useState(initialData?.services  || []);

    const addLocation = useCallback((loc) => {
        setLocations(prev => {
            const nums = prev.map(l => parseInt(l.location_id.replace("LOC", ""), 10));
            const next = Math.max(...nums, 0) + 1;
            return [...prev, { ...loc, location_id: `LOC${String(next).padStart(3, "0")}`, last_checked: new Date().toISOString() }];
        });
    }, []);

    const updateLocation = useCallback((loc) => {
        setLocations(prev => prev.map(l => l.location_id === loc.location_id
            ? { ...loc, last_checked: new Date().toISOString() } : l));
    }, []);

    const addService = useCallback((svc) => {
        setServices(prev => {
            const nums = prev.map(s => parseInt(s.service_id.replace("SRV", ""), 10));
            const next = Math.max(...nums, 0) + 1;
            return [...prev, { ...svc, service_id: `SRV${String(next).padStart(3, "0")}`, last_checked: new Date().toISOString(), last_verified: new Date().toISOString() }];
        });
    }, []);

    const updateService = useCallback((svc) => {
        setServices(prev => prev.map(s => s.service_id === svc.service_id
            ? { ...svc, last_checked: new Date().toISOString(), last_verified: new Date().toISOString() } : s));
    }, []);

    const verifyService = useCallback((id) => {
        setServices(prev => prev.map(s => s.service_id === id
            ? { ...s, last_verified: new Date().toISOString() } : s));
    }, []);

    return (
        <DataContext.Provider value={{ locations, services, addLocation, updateLocation, addService, updateService, verifyService }}>
            {children}
        </DataContext.Provider>
    );
};


const SIX_MONTHS = 6 * 30 * 86400000;
const isStale    = (svc) => Date.now() - (svc.last_verified ? new Date(svc.last_verified).getTime() : 0) > SIX_MONTHS;

const formatDate = (iso) => {
    const d = new Date(iso), now = new Date();
    const diffMins = Math.floor((now - d) / 60000);
    if (diffMins < 60)  return `${diffMins} min geleden`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} uur geleden`;
    return `${Math.floor(diffHours / 24)} dagen geleden`;
};

const Badge = ({ label, style }) => (
    <span style={{ display: "inline-block", fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: T.radiusLg, whiteSpace: "nowrap", fontFamily: T.fontBody, ...style }}>{label}</span>
);
const CategoryBadge = ({ cat }) => {
    const c = categoryColors[cat] || { bg: T.surface2, text: T.textSecondary };
    return <Badge label={cat} style={{ background: c.bg, color: c.text }} />;
};
const AccessBadge = ({ at }) => {
    const c = accessColors[at] || { bg: T.surface2, text: T.textSecondary };
    return <Badge label={at} style={{ background: c.bg, color: c.text }} />;
};
const LocTypeBadge = ({ lt }) => {
    const c = locTypeColors[lt] || { bg: T.surface2, text: T.textSecondary };
    return <Badge label={lt} style={{ background: c.bg, color: c.text }} />;
};

const Field = ({ label, children }) => (
    <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: T.textSecondary, marginBottom: 4, fontFamily: T.fontBody }}>{label}</label>
        {children}
    </div>
);

const inputStyle = {
    width: "100%", boxSizing: "border-box", height: 34, padding: "0 10px",
    fontSize: 13, borderRadius: T.radiusSm, border: `1px solid ${T.border}`,
    background: T.surface, color: T.textPrimary, outline: "none",
    fontFamily: "'Outfit', system-ui, sans-serif",
};
const Input    = ({ value, onChange, placeholder, type = "text" }) => (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
);
const Select   = ({ value, onChange, options }) => (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, height: 34, padding: "0 10px" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
);
const Textarea = ({ value, onChange, rows = 3 }) => (
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
              style={{ ...inputStyle, height: "auto", padding: "6px 10px", resize: "vertical" }} />
);

const Btn = ({ onClick, variant = "primary", children, small }) => {
    const base = { border: "none", borderRadius: T.radiusSm, cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap", fontFamily: "'Outfit', system-ui, sans-serif", transition: "opacity 0.12s" };
    const styles = {
        primary:   { ...base, background: T.textPrimary, color: T.bg,          padding: small ? "5px 12px" : "7px 16px", fontSize: small ? 12 : 13 },
        secondary: { ...base, background: T.surface2,    color: T.textPrimary, border: `1px solid ${T.border}`, padding: small ? "5px 12px" : "7px 16px", fontSize: small ? 12 : 13 },
        danger:    { ...base, background: T.accentLight, color: T.accent,      border: `1px solid #f0c4b8`, padding: small ? "5px 12px" : "7px 16px", fontSize: small ? 12 : 13 },
    };
    return <button onClick={onClick} style={styles[variant]}>{children}</button>;
};

const Modal = ({ open, onClose, title, children, wide }) => {
    if (!open) return null;
    return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(26,23,20,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
             onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={{ background: T.surface, borderRadius: T.radiusMd, border: `1px solid ${T.border}`, width: "100%", maxWidth: wide ? 720 : 520, maxHeight: "90vh", overflow: "auto", boxShadow: T.shadowLg, fontFamily: T.fontBody }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, fontFamily: T.fontDisplay }}>{title}</span>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1, color: T.textMuted, padding: "0 4px" }}>×</button>
                </div>
                <div style={{ padding: "20px" }}>{children}</div>
            </div>
        </div>
    );
};



const LocationForm = ({ loc, onSave, onClose }) => {
    const empty = { name: "", address: "", postcode: "", latitude: "", longitude: "", location_type: "Buurthuis", google_map_link: "" };
    const [form, setForm] = useState(loc ? { ...loc } : empty);
    const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
    const typeOpts = ["Buurthuis", "Wijkcentrum", "Gezondheidscentrum", "Bibliotheek", "Gemeentehuis", "Sporthal", "Voedselbank", "Jeugdhuis", "government", "organization", "hub"]
        .map(t => ({ value: t, label: t }));

    return (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ gridColumn: "1 / -1" }}><Field label="Naam"><Input value={form.name} onChange={set("name")} placeholder="Naam locatie" /></Field></div>
                <div style={{ gridColumn: "1 / -1" }}><Field label="Adres"><Input value={form.address} onChange={set("address")} placeholder="Straat + huisnummer" /></Field></div>
                <div style={{ gridColumn: "1 / -1" }}><Field label="Google Maps Link"><Input value={form.google_map_link} onChange={set("google_map_link")} placeholder="https://maps.google.com/..." /></Field></div>
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

const ServiceForm = ({ svc, locations, onSave, onClose }) => {
    const empty = { name: "", category: "Gezondheid en zorg", type: "Advies", description: "", target_group: "", income_requirement: "Geen", cost_to_user: "Gratis", access_type: "walkin", location_id: locations[0]?.location_id || "", availability: "", phone: "", email: "", website: "", needs_referral: false, keywords: "", notes: "" };
    const [form, setForm] = useState(svc ? { ...svc } : empty);
    const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

    const cats     = ["Hulp bij schulden", "Kinderen en opgroeien", "Gezondheid en zorg", "Studeren en werken", "Wonen en energie besparen", "Onkosten en dagelijks leven"].map(c => ({ value: c, label: c }));
    const types    = ["Advies", "Cursus", "Dagopvang", "Groepsactiviteit", "Huisbezoek", "Medische zorg", "Persoonlijke begeleiding", "Subsidie", "Uitgifte", "Workshop", "Ondersteuning", "Regeling", "Informatie"].map(t => ({ value: t, label: t }));
    const accesses = ["walkin", "appointment", "phone", "online", "home_visit", "referral_only"].map(a => ({ value: a, label: a }));
    const locOpts  = locations.map(l => ({ value: l.location_id, label: `${l.location_id} — ${l.name}` }));

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
                    <label htmlFor="ref" style={{ fontSize: 13, color: T.textPrimary }}>Verwijzing nodig</label>
                </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <Btn variant="secondary" onClick={onClose}>Annuleren</Btn>
                <Btn onClick={() => { onSave(form); onClose(); }}>Opslaan</Btn>
            </div>
        </div>
    );
};

const OverviewPage = () => {
    const { locations, services } = useData();
    const sevenDaysAgo  = new Date(Date.now() - 7 * 86400000);
    const recentChanges = [...locations, ...services].filter(r => new Date(r.last_checked) >= sevenDaysAgo).length;
    const staleCount    = services.filter(isStale).length;

    const stats = [
        { label: "Totaal Locaties",      value: locations.length, sub: "In de database" },
        { label: "Totaal Diensten",       value: services.length,  sub: "Beschikbare services" },
        { label: "Updates (7 dagen)",     value: recentChanges,    sub: "Recente wijzigingen" },
        { label: "Verlopen verificaties", value: staleCount,       sub: "Ouder dan 6 maanden", warn: staleCount > 0 },
    ];

    const recent = [
        ...locations.map(l => ({ id: l.location_id, name: l.name, type: "Locatie", last_checked: l.last_checked })),
        ...services.map(s  => ({ id: s.service_id,  name: s.name, type: "Dienst",  last_checked: s.last_checked })),
    ].sort((a, b) => new Date(b.last_checked) - new Date(a.last_checked)).slice(0, 6);

    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 4px", fontFamily: T.fontDisplay, color: T.textPrimary }}>Overview</h1>
                <p style={{ color: T.textSecondary, fontSize: 13, margin: 0 }}>Welkom terug, Admin. Hier is een overzicht van uw database.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                {stats.map(s => (
                    <div key={s.label} style={{ background: s.warn ? T.accentLight : T.surface, border: `1px solid ${s.warn ? "#f0c4b8" : T.border}`, borderRadius: T.radiusMd, padding: "14px 16px", boxShadow: T.shadowSm }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: s.warn ? T.accent : T.textMuted, marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: s.warn ? T.accent : T.textPrimary, fontFamily: T.fontDisplay }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: s.warn ? T.accent : T.textMuted, marginTop: 2 }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, overflow: "hidden", boxShadow: T.shadowSm }}>
                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, fontFamily: T.fontDisplay }}>Recente activiteit</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: T.fontBody }}>
                    <thead>
                        <tr style={{ background: T.surface2 }}>
                            {["Naam", "Type", "Gecontroleerd"].map(h => (
                                <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 11, fontWeight: 600, color: T.textMuted, borderBottom: `1px solid ${T.border}`, letterSpacing: 0.4 }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {recent.map(r => (
                            <tr key={r.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                                <td style={{ padding: "9px 14px", fontWeight: 500, color: T.textPrimary }}>{r.name}</td>
                                <td style={{ padding: "9px 14px" }}>
                                    <Badge label={r.type} style={{ background: r.type === "Locatie" ? "#e5eaff" : "#ede8f5", color: r.type === "Locatie" ? "#1a2eaa" : "#3d1f6b" }} />
                                </td>
                                <td style={{ padding: "9px 14px", color: T.textMuted }}>{formatDate(r.last_checked)}</td>
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
    const [search,     setSearch]     = useState("");
    const [filterType, setFilterType] = useState("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editLoc,    setEditLoc]    = useState(null);

    const types    = [...new Set(locations.map(l => l.location_type))].sort();
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
                    <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 2px", fontFamily: T.fontDisplay, color: T.textPrimary }}>Locaties</h1>
                    <p style={{ color: T.textSecondary, fontSize: 13, margin: 0 }}>Beheer alle locaties in de database</p>
                </div>
                <Btn onClick={() => { setEditLoc(null); setDialogOpen(true); }}>+ Nieuwe locatie</Btn>
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, overflow: "hidden", boxShadow: T.shadowSm }}>
                <div style={{ display: "flex", gap: 10, padding: 14, borderBottom: `1px solid ${T.border}`, flexWrap: "wrap" }}>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek locatie..."
                           style={{ flex: 1, minWidth: 160, height: 32, padding: "0 10px", fontSize: 13, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface2, color: T.textPrimary, outline: "none", fontFamily: T.fontBody }} />
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                            style={{ height: 32, padding: "0 8px", fontSize: 13, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface2, color: T.textPrimary, fontFamily: T.fontBody }}>
                        <option value="all">Alle types</option>
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: T.fontBody }}>
                        <thead>
                            <tr style={{ background: T.surface2 }}>
                                {["Naam", "Adres", "Google Maps", "Postcode", "Type", "Gecontroleerd"].map(h => (
                                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: T.textMuted, borderBottom: `1px solid ${T.border}`, letterSpacing: 0.4 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(l => (
                                <tr key={l.location_id}
                                    onClick={() => { setEditLoc(l); setDialogOpen(true); }}
                                    style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}
                                    onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                                    <td style={{ padding: "9px 12px", fontWeight: 500, color: T.textPrimary }}>{l.name}</td>
                                    <td style={{ padding: "9px 12px", color: T.textSecondary }}>{l.address}</td>
                                    <td style={{ padding: "9px 12px" }}>
                                        {l.google_map_link
                                            ? <a href={l.google_map_link} target="_blank" rel="noreferrer" style={{ color: T.accent, textDecoration: "none", fontWeight: 500 }} onClick={e => e.stopPropagation()}>Link ↗</a>
                                            : <span style={{ color: T.textMuted }}>—</span>}
                                    </td>
                                    <td style={{ padding: "9px 12px", fontFamily: "monospace", fontSize: 12, color: T.textSecondary }}>{l.postcode}</td>
                                    <td style={{ padding: "9px 12px" }}><LocTypeBadge lt={l.location_type} /></td>
                                    <td style={{ padding: "9px 12px", color: T.textMuted }}>{formatDate(l.last_checked)}</td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} style={{ padding: "24px 12px", textAlign: "center", color: T.textMuted }}>Geen locaties gevonden</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding: "10px 14px", borderTop: `1px solid ${T.border}`, fontSize: 12, color: T.textMuted }}>{filtered.length} locaties</div>
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
    const [search,       setSearch]       = useState("");
    const [filterCat,    setFilterCat]    = useState("all");
    const [filterAccess, setFilterAccess] = useState("all");
    const [page,         setPage]         = useState(0);
    const [dialogOpen,   setDialogOpen]   = useState(false);
    const [editSvc,      setEditSvc]      = useState(null);
    const PER_PAGE = 8;

    const cats     = [...new Set(services.map(s => s.category))].sort();
    const accesses = [...new Set(services.map(s => s.access_type))].sort();

    const filtered = services.filter(s => {
        if (filterCat    !== "all" && s.category    !== filterCat)    return false;
        if (filterAccess !== "all" && s.access_type !== filterAccess) return false;
        if (search) {
            const q = search.toLowerCase();
            return [s.name, s.service_id, s.category, s.type, s.target_group, s.keywords].join(" ").toLowerCase().includes(q);
        }
        return true;
    });

    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    const paged      = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 2px", fontFamily: T.fontDisplay, color: T.textPrimary }}>Diensten</h1>
                    <p style={{ color: T.textSecondary, fontSize: 13, margin: 0 }}>Beheer alle diensten in de database</p>
                </div>
                <Btn onClick={() => { setEditSvc(null); setDialogOpen(true); }}>+ Nieuwe dienst</Btn>
            </div>

            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, overflow: "hidden", boxShadow: T.shadowSm }}>
                <div style={{ display: "flex", gap: 10, padding: 14, borderBottom: `1px solid ${T.border}`, flexWrap: "wrap" }}>
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Zoek op naam, ID, trefwoord..."
                           style={{ flex: 1, minWidth: 180, height: 32, padding: "0 10px", fontSize: 13, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface2, color: T.textPrimary, outline: "none", fontFamily: T.fontBody }} />
                    <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(0); }}
                            style={{ height: 32, padding: "0 8px", fontSize: 13, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface2, color: T.textPrimary, fontFamily: T.fontBody }}>
                        <option value="all">Alle categorieën</option>
                        {cats.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={filterAccess} onChange={e => { setFilterAccess(e.target.value); setPage(0); }}
                            style={{ height: 32, padding: "0 8px", fontSize: 13, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface2, color: T.textPrimary, fontFamily: T.fontBody }}>
                        <option value="all">Alle toegang</option>
                        {accesses.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: T.fontBody }}>
                        <thead>
                            <tr style={{ background: T.surface2 }}>
                                {["", "Naam", "Categorie", "Type", "Kosten", "Toegang", "Gecontroleerd"].map((h, i) => (
                                    <th key={i} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 600, color: T.textMuted, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", letterSpacing: 0.4 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map(s => (
                                <tr key={s.service_id}
                                    onClick={() => { setEditSvc(s); setDialogOpen(true); }}
                                    style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}
                                    onMouseEnter={e => e.currentTarget.style.background = T.surface2}
                                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                                    <td style={{ padding: "8px 10px 8px 14px", width: 24 }}>
                                        {isStale(s) ? (
                                            <button onClick={e => { e.stopPropagation(); verifyService(s.service_id); }}
                                                    title="Verificatie verlopen — klik om te bevestigen"
                                                    style={{ background: T.accentLight, border: "none", borderRadius: T.radiusSm, width: 22, height: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: T.accent }}>!</button>
                                        ) : (
                                            <span style={{ color: "#2d6b27", fontSize: 14 }}>✓</span>
                                        )}
                                    </td>
                                    <td style={{ padding: "8px 12px", fontWeight: 500, color: T.textPrimary }}>{s.name}</td>
                                    <td style={{ padding: "8px 12px" }}><CategoryBadge cat={s.category} /></td>
                                    <td style={{ padding: "8px 12px", color: T.textSecondary }}>{s.type}</td>
                                    <td style={{ padding: "8px 12px", color: T.textSecondary }}>{s.cost_to_user}</td>
                                    <td style={{ padding: "8px 12px" }}><AccessBadge at={s.access_type} /></td>
                                    <td style={{ padding: "8px 12px", color: T.textMuted }}>{formatDate(s.last_checked)}</td>
                                </tr>
                            ))}
                            {paged.length === 0 && (
                                <tr><td colSpan={7} style={{ padding: "24px 12px", textAlign: "center", color: T.textMuted }}>Geen diensten gevonden</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 12, color: T.textMuted }}>{filtered.length} resultaten</span>
                    {totalPages > 1 && (
                        <div style={{ display: "flex", gap: 4 }}>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button key={i} onClick={() => setPage(i)}
                                        style={{ width: 28, height: 28, borderRadius: T.radiusSm, border: `1px solid ${i === page ? T.textPrimary : T.border}`, background: i === page ? T.textPrimary : "transparent", color: i === page ? T.bg : T.textPrimary, cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: T.fontBody }}>
                                    {i + 1}
                                </button>
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


const LoginPage = ({ onLogin }) => {
    const navigate = useNavigate();
    const [user,     setUser]     = useState("");
    const [pass,     setPass]     = useState("");
    const [showPass, setShowPass] = useState(false);

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, padding: 16, fontFamily: T.fontBody }}>
            <link rel="stylesheet" href={GOOGLE_FONTS} />
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusMd, width: "100%", maxWidth: 380, padding: 32, boxShadow: T.shadowMd }}>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                    <div style={{ width: 44, height: 44, background: T.textPrimary, borderRadius: T.radiusSm, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                        <span style={{ color: T.bg, fontSize: 18 }}>⬡</span>
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 4px", fontFamily: T.fontDisplay, color: T.textPrimary }}>Beheer inloggen</h2>
                    <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>Meld u aan om het beheerpaneel te openen</p>
                </div>
                <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: T.textSecondary, marginBottom: 4 }}>Gebruikersnaam</label>
                    <input value={user} onChange={e => setUser(e.target.value)} placeholder="admin"
                           style={{ width: "100%", boxSizing: "border-box", height: 36, padding: "0 10px", fontSize: 13, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface, color: T.textPrimary, outline: "none", fontFamily: T.fontBody }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: T.textSecondary, marginBottom: 4 }}>Wachtwoord</label>
                    <div style={{ position: "relative" }}>
                        <input type={showPass ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
                               style={{ width: "100%", boxSizing: "border-box", height: 36, padding: "0 36px 0 10px", fontSize: 13, borderRadius: T.radiusSm, border: `1px solid ${T.border}`, background: T.surface, color: T.textPrimary, outline: "none", fontFamily: T.fontBody }} />
                        <button onClick={() => setShowPass(!showPass)}
                                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 13 }}>
                            {showPass ? "🙈" : "👁"}
                        </button>
                    </div>
                </div>
                <button onClick={onLogin}
                        style={{ width: "100%", height: 36, background: T.textPrimary, color: T.bg, border: "none", borderRadius: T.radiusSm, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 10, fontFamily: T.fontBody }}>
                    Inloggen
                </button>
                <button onClick={() => navigate("/")}
                        style={{ width: "100%", height: 36, background: "transparent", color: T.textSecondary, border: `1px solid ${T.border}`, borderRadius: T.radiusSm, fontSize: 13, cursor: "pointer", fontFamily: T.fontBody }}>
                    ← Terug naar hoofdmenu
                </button>
            </div>
        </div>
    );
};



export default function DBManager() {
    const navigate = useNavigate();
    const [loggedIn,    setLoggedIn]    = useState(false);
    const [page,        setPage]        = useState("overview");
    const [initialData, setInitialData] = useState({ locations: [], services: [] });

    useEffect(() => {
        loadInitialData()
            .then(data => setInitialData(data))
            .catch(err  => console.error("Error loading CSV data:", err));
    }, []);

    if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;

    const navItems = [
        { id: "overview",  label: "Overview", icon: "⊞" },
        { id: "locations", label: "Locaties",  icon: "◎" },
        { id: "services",  label: "Diensten",  icon: "◈" },
    ];

    return (
        <DataProvider initialData={initialData}>
            <link rel="stylesheet" href={GOOGLE_FONTS} />
            <div style={{ display: "flex", height: "100vh", fontFamily: T.fontBody, fontSize: 13, background: T.bg, color: T.textPrimary }}>

                {/* ── Sidebar ── */}
                <div style={{ width: 220, flexShrink: 0, background: T.surface, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, background: T.textPrimary, borderRadius: T.radiusSm, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: T.bg, flexShrink: 0 }}>⬡</div>
                        <span style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 15, color: T.textPrimary }}>DBAdmin</span>
                    </div>
                    <nav style={{ flex: 1, padding: "12px 8px" }}>
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => setPage(item.id)}
                                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: T.radiusSm, border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, marginBottom: 2, background: page === item.id ? T.surface2 : "transparent", color: page === item.id ? T.textPrimary : T.textMuted, fontWeight: page === item.id ? 600 : 400, fontFamily: T.fontBody }}>
                                <span style={{ fontSize: 15 }}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                        <button onClick={() => navigate("/")}
                                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: T.radiusSm, border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, marginTop: 8, background: "transparent", color: T.textMuted, fontFamily: T.fontBody }}>
                            <span style={{ fontSize: 15 }}>←</span>
                            Hoofdmenu
                        </button>
                    </nav>
                    <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 28, height: 28, background: T.textPrimary, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: T.bg, fontWeight: 600 }}>A</div>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: T.textPrimary }}>Admin User</div>
                                <div style={{ fontSize: 11, color: T.textMuted }}>admin@dbadmin.nl</div>
                            </div>
                        </div>
                        <button onClick={() => setLoggedIn(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 14 }} title="Uitloggen">↩</button>
                    </div>
                </div>

                {/* ── Main content ── */}
                <div style={{ flex: 1, overflow: "auto" }}>
                    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px" }}>
                        {page === "overview"  && <OverviewPage />}
                        {page === "locations" && <LocationsPage />}
                        {page === "services"  && <ServicesPage />}
                    </div>
                </div>

            </div>
        </DataProvider>
    );
}