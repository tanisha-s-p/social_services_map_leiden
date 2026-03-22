import { useState, createContext, useContext, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const now = new Date();
const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString();
const monthsAgo = (m) => new Date(now.getTime() - m * 30 * 86400000).toISOString();

// ——— CSV Parser ———
const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));

        const row = {};
        headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
        });
        rows.push(row);
    }

    return rows;
};

const csvToLocations = (csvText) => {
    const rows = parseCSV(csvText);
    return rows.map(row => ({
        location_id: row.location_id || row.id || '',
        name: row.name || '',
        address: row.address || '',
        postcode: row.postcode || '',
        latitude: parseFloat(row.latitude) || 0,
        longitude: parseFloat(row.longitude) || 0,
        location_type: row.location_type || row.type || 'Buurthuis',
        google_map_link: row.google_map_link || '',
        last_checked: row.last_checked || new Date().toISOString(),
    })).filter(l => l.location_id && l.name);
};

const csvToServices = (csvText) => {
    const rows = parseCSV(csvText);
    return rows.map(row => ({
        service_id: row.service_id || row.id || '',
        name: row.name || '',
        category: row.category || 'Gezondheid en zorg',
        type: row.type || 'Advies',
        description: row.description || '',
        target_group: row.target_group || '',
        income_requirement: row.income_requirement || 'Geen',
        cost_to_user: row.cost_to_user || 'Gratis',
        access_type: row.access_type || 'Inloop',
        location_id: row.location_id || '',
        availability: row.availability || '',
        phone: row.phone || '',
        email: row.email || '',
        website: row.website || '',
        keywords: row.keywords || '',
        notes: row.notes || '',
        needs_referral: row.needs_referral === 'Yes' || row.needs_referral === 'true' || row.needs_referral === '1' || false,
        last_checked: row.last_checked || new Date().toISOString(),
        last_verified: row.last_verified || new Date().toISOString(),
    })).filter(s => s.service_id && s.name);
};

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
    const locationsCSV = await loadCSVFile('locations.csv');
    const servicesCSV = await loadCSVFile('services.csv');

    return {
        locations: csvToLocations(locationsCSV),
        services: csvToServices(servicesCSV),
    };
};

// ——— Context ———
const DataContext = createContext(null);
const useData = () => useContext(DataContext);

const DataProvider = ({ children, initialData }) => {
    const [locations, setLocations] = useState(initialData?.locations || []);
    const [services, setServices] = useState(initialData?.services || []);

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
    "walkin": { bg: "#ECFDF5", text: "#065F46" },
    "appointment": { bg: "#EEF2FF", text: "#3730A3" },
    "phone": { bg: "#F0F9FF", text: "#0C4A6E" },
    "home_visit": { bg: "#FEF3C7", text: "#92400E" },
    "online": { bg: "#F0F9FF", text: "#0C4A6E" },
    "referral_only": { bg: "#FFF1F2", text: "#9F1239" },
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
    government: { bg: "#DBEAFE", text: "#1E40AF" },
    organization: { bg: "#D1FAE5", text: "#065F46" },
    hub: { bg: "#EDE9FE", text: "#5B21B6" },
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
        <div
            style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.5)",
                zIndex: 1000,
                display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div style={{
                background: "#ffffff",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                width: "100%",
                maxWidth: wide ? 720 : 520,
                maxHeight: "90vh",
                overflow: "auto",
                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}>
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 20px",
                    borderBottom: "1px solid #e2e8f0",
                    background: "#ffffff",
                }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "#1e293b" }}>{title}</span>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, lineHeight: 1, color: "#64748b", padding: "0 4px" }}>×</button>
                </div>
                <div style={{ padding: "20px", background: "#ffffff" }}>{children}</div>
            </div>
        </div>
    );
};

const Field = ({ label, children }) => (
    <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748b", marginBottom: 4 }}>{label}</label>
        {children}
    </div>
);

const inputStyle = {
    width: "100%", boxSizing: "border-box", height: 34, padding: "0 10px",
    fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1",
    background: "#ffffff", color: "#1e293b", outline: "none",
};

const Input = ({ value, onChange, placeholder, type = "text" }) => (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
);

const Select = ({ value, onChange, options }) => (
    <select value={value} onChange={e => onChange(e.target.value)}
            style={{ ...inputStyle, height: 34, padding: "0 10px" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
);

const Textarea = ({ value, onChange, rows = 3 }) => (
    <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
              style={{ ...inputStyle, height: "auto", padding: "6px 10px", resize: "vertical" }} />
);

const Btn = ({ onClick, variant = "primary", children, small }) => {
    const base = { border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" };
    const styles = {
        primary: { ...base, background: "#1E293B", color: "#fff", padding: small ? "5px 12px" : "7px 16px", fontSize: small ? 12 : 13 },
        secondary: { ...base, background: "#f8fafc", color: "#1e293b", border: "1px solid #cbd5e1", padding: small ? "5px 12px" : "7px 16px", fontSize: small ? 12 : 13 },
        danger: { ...base, background: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA", padding: small ? "5px 12px" : "7px 16px", fontSize: small ? 12 : 13 },
    };
    return <button onClick={onClick} style={styles[variant]}>{children}</button>;
};

// ——— Location Form ———
const LocationForm = ({ loc, onSave, onClose }) => {
    const empty = { name: "", address: "", postcode: "", latitude: "", longitude: "", location_type: "Buurthuis",google_map_link: "" };
    const [form, setForm] = useState(loc ? { ...loc } : empty);
    const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
    const typeOpts = ["Buurthuis", "Wijkcentrum", "Gezondheidscentrum", "Bibliotheek", "Gemeentehuis", "Sporthal", "Voedselbank", "Jeugdhuis", "government", "organization", "hub"].map(t => ({ value: t, label: t }));

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

// ——— Service Form ———
const ServiceForm = ({ svc, locations, onSave, onClose }) => {
    const empty = { name: "", category: "Gezondheid en zorg", type: "Advies", description: "", target_group: "", income_requirement: "Geen", cost_to_user: "Gratis", access_type: "walkin", location_id: locations[0]?.location_id || "", availability: "", phone: "", email: "", website: "", needs_referral: false, keywords: "", notes: "" };
    const [form, setForm] = useState(svc ? { ...svc } : empty);
    const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

    const cats = ["Hulp bij schulden", "Kinderen en opgroeien", "Gezondheid en zorg", "Studeren en werken", "Wonen en energie besparen", "Onkosten en dagelijks leven"].map(c => ({ value: c, label: c }));
    const types = ["Advies", "Cursus", "Dagopvang", "Groepsactiviteit", "Huisbezoek", "Medische zorg", "Persoonlijke begeleiding", "Subsidie", "Uitgifte", "Workshop", "Ondersteuning", "Regeling", "Informatie"].map(t => ({ value: t, label: t }));
    const accesses = ["walkin", "appointment", "phone", "online", "home_visit", "referral_only"].map(a => ({ value: a, label: a }));
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
                    <label htmlFor="ref" style={{ fontSize: 13, color: "#1e293b" }}>Verwijzing nodig</label>
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
                <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Welkom terug, Admin. Hier is een overzicht van uw database.</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                {stats.map(s => (
                    <div key={s.label} style={{ background: s.warn ? "#FFF7ED" : "#f8fafc", borderRadius: 8, padding: "14px 16px" }}>
                        <div style={{ fontSize: 12, color: s.warn ? "#9A3412" : "#64748b", marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 26, fontWeight: 500, color: s.warn ? "#C2410C" : "#1e293b" }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: s.warn ? "#EA580C" : "#94a3b8" }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>Recente activiteit</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                    <tr style={{ background: "#f8fafc" }}>
                        {["Naam", "Type", "Gecontroleerd"].map(h => (
                            <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 11, fontWeight: 500, color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {recent.map(r => (
                        <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "9px 14px", fontWeight: 500 }}>{r.name}</td>
                            <td style={{ padding: "9px 14px" }}>
                                <Badge label={r.type} style={{ background: r.type === "Locatie" ? "#DBEAFE" : "#EDE9FE", color: r.type === "Locatie" ? "#1E40AF" : "#5B21B6" }} />
                            </td>
                            <td style={{ padding: "9px 14px", color: "#64748b" }}>{formatDate(r.last_checked)}</td>
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
                    <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Beheer alle locaties in de database</p>
                </div>
                <Btn onClick={() => { setEditLoc(null); setDialogOpen(true); }}>+ Nieuwe locatie</Btn>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 10, padding: 14, borderBottom: "1px solid #e2e8f0", flexWrap: "wrap" }}>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Zoek locatie..."
                           style={{ flex: 1, minWidth: 160, height: 32, padding: "0 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b", outline: "none" }} />
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                            style={{ height: 32, padding: "0 8px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b" }}>
                        <option value="all">Alle types</option>
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                        <tr style={{ background: "#f8fafc" }}>
                            {["Naam", "Adres", "Google Maps", "Postcode", "Type", "Gecontroleerd"].map(h => (
                                <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {filtered.map(l => (
                            <tr key={l.location_id} onClick={() => { setEditLoc(l); setDialogOpen(true); }}
                                style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                onMouseLeave={e => e.currentTarget.style.background = ""}>
                                <td style={{ padding: "9px 12px", fontWeight: 500 }}>{l.name}</td>
                                <td style={{ padding: "9px 12px", color: "#64748b" }}>{l.address}</td>
                                <td style={{ padding: "9px 12px" }}>
                                    {l.google_map_link ? (
                                        <a 
                                        href={l.google_map_link} 
                                        target="_blank" 
                                        rel="noreferrer" 
                                        style={{ color: "#3b82f6", textDecoration: "none" }}
                                        onClick={e => e.stopPropagation()} /* Prevents row click */
                                        >
                                            Link ↗
                                        </a>
                                    ) : "-"}
                                </td>
                                <td style={{ padding: "9px 12px", fontFamily: "monospace", fontSize: 12 }}>{l.postcode}</td>
                                <td style={{ padding: "9px 12px" }}><LocTypeBadge lt={l.location_type} /></td>
                                <td style={{ padding: "9px 12px", color: "#64748b" }}>{formatDate(l.last_checked)}</td>
                            </tr>
                        ))}
                        {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: "24px 12px", textAlign: "center", color: "#64748b" }}>Geen locaties gevonden</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding: "10px 14px", borderTop: "1px solid #e2e8f0", fontSize: 12, color: "#64748b" }}>{filtered.length} locaties</div>
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
                    <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Beheer alle diensten in de database</p>
                </div>
                <Btn onClick={() => { setEditSvc(null); setDialogOpen(true); }}>+ Nieuwe dienst</Btn>
            </div>

            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 10, padding: 14, borderBottom: "1px solid #e2e8f0", flexWrap: "wrap" }}>
                    <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Zoek op naam, ID, trefwoord..."
                           style={{ flex: 1, minWidth: 180, height: 32, padding: "0 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b", outline: "none" }} />
                    <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(0); }}
                            style={{ height: 32, padding: "0 8px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b" }}>
                        <option value="all">Alle categorieën</option>
                        {cats.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={filterAccess} onChange={e => { setFilterAccess(e.target.value); setPage(0); }}
                            style={{ height: 32, padding: "0 8px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", color: "#1e293b" }}>
                        <option value="all">Alle toegang</option>
                        {accesses.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                        <tr style={{ background: "#f8fafc" }}>
                            {["", "Naam", "Categorie", "Type", "Kosten", "Toegang", "Gecontroleerd"].map((h, i) => (
                                <th key={i} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 500, color: "#64748b", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {paged.map(s => (
                            <tr key={s.service_id} onClick={() => { setEditSvc(s); setDialogOpen(true); }}
                                style={{ borderBottom: "1px solid #e2e8f0", cursor: "pointer" }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
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
                                <td style={{ padding: "8px 12px", fontWeight: 500 }}>{s.name}</td>
                                <td style={{ padding: "8px 12px" }}><CategoryBadge cat={s.category} /></td>
                                <td style={{ padding: "8px 12px", color: "#64748b" }}>{s.type}</td>
                                <td style={{ padding: "8px 12px" }}>{s.cost_to_user}</td>
                                <td style={{ padding: "8px 12px" }}><AccessBadge at={s.access_type} /></td>
                                <td style={{ padding: "8px 12px", color: "#64748b" }}>{formatDate(s.last_checked)}</td>
                            </tr>
                        ))}
                        {paged.length === 0 && <tr><td colSpan={7} style={{ padding: "24px 12px", textAlign: "center", color: "#64748b" }}>Geen diensten gevonden</td></tr>}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderTop: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{filtered.length} resultaten</span>
                    {totalPages > 1 && (
                        <div style={{ display: "flex", gap: 4 }}>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button key={i} onClick={() => setPage(i)}
                                        style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${i === page ? "#1E293B" : "#cbd5e1"}`, background: i === page ? "#1E293B" : "transparent", color: i === page ? "#fff" : "#1e293b", cursor: "pointer", fontSize: 12, fontWeight: 500 }}>{i + 1}</button>
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
    const navigate = useNavigate();
    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const [showPass, setShowPass] = useState(false);

    return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", padding: 16 }}>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, width: "100%", maxWidth: 380, padding: 32 }}>
                <div style={{ textAlign: "center", marginBottom: 28 }}>
                    <div style={{ width: 44, height: 44, background: "#1E293B", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontSize: 20 }}>
                        <span style={{ color: "#fff", fontSize: 18 }}>⬡</span>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 4px" }}>DBAdmin</h2>
                    <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Meld u aan om het beheerpaneel te openen</p>
                </div>
                <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748b", marginBottom: 4 }}>Gebruikersnaam</label>
                    <input value={user} onChange={e => setUser(e.target.value)} placeholder="admin"
                           style={{ width: "100%", boxSizing: "border-box", height: 36, padding: "0 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", color: "#1e293b", outline: "none" }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#64748b", marginBottom: 4 }}>Wachtwoord</label>
                    <div style={{ position: "relative" }}>
                        <input type={showPass ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••"
                               style={{ width: "100%", boxSizing: "border-box", height: 36, padding: "0 36px 0 10px", fontSize: 13, borderRadius: 6, border: "1px solid #cbd5e1", background: "#ffffff", color: "#1e293b", outline: "none" }} />
                        <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 13 }}>{showPass ? "🙈" : "👁"}</button>
                    </div>
                </div>
                <button onClick={onLogin} style={{ width: "100%", height: 36, background: "#1E293B", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", marginBottom: 12 }}>Inloggen</button>
                <button onClick={() => navigate("/")} style={{ width: "100%", height: 36, background: "transparent", color: "#64748b", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>← Terug naar hoofdmenu</button>
            </div>
        </div>
    );
};

// ——— Main DBManager ———
export default function DBManager() {
    const navigate = useNavigate();
    const [loggedIn, setLoggedIn] = useState(false);
    const [page, setPage] = useState("overview");
    const [initialData, setInitialData] = useState({ locations: [], services: [] });

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await loadInitialData();
                setInitialData(data);
            } catch (error) {
                console.error("Error loading CSV data:", error);
            }
        };
        loadData();
    }, []);

    if (!loggedIn) return <LoginPage onLogin={() => setLoggedIn(true)} />;

    const navItems = [
        { id: "overview", label: "Overview", icon: "⊞" },
        { id: "locations", label: "Locaties", icon: "◎" },
        { id: "services", label: "Diensten", icon: "◈" },
    ];

    return (
        <DataProvider initialData={initialData}>
            <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13, background: "#f1f5f9" }}>
                {/* Sidebar */}
                <div style={{ width: 220, flexShrink: 0, background: "#ffffff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, background: "#1E293B", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", flexShrink: 0 }}>⬡</div>
                        <span style={{ fontWeight: 500, fontSize: 14 }}>DBAdmin</span>
                    </div>
                    <nav style={{ flex: 1, padding: "12px 8px" }}>
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => setPage(item.id)}
                                    style={{
                                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                                        padding: "8px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                                        textAlign: "left", fontSize: 13, marginBottom: 2,
                                        background: page === item.id ? "#F1F5F9" : "transparent",
                                        color: page === item.id ? "#1E293B" : "#64748b",
                                        fontWeight: page === item.id ? 500 : 400,
                                    }}>
                                <span style={{ fontSize: 15 }}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                        <button onClick={() => navigate("/")}
                                style={{
                                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                                    padding: "8px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                                    textAlign: "left", fontSize: 13, marginTop: 8,
                                    background: "transparent", color: "#94a3b8",
                                }}>
                            <span style={{ fontSize: 15 }}>←</span>
                            Hoofdmenu
                        </button>
                    </nav>
                    <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 28, height: 28, background: "#1E293B", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#fff", fontWeight: 500 }}>A</div>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 500 }}>Admin User</div>
                                <div style={{ fontSize: 11, color: "#64748b" }}>admin@dbadmin.nl</div>
                            </div>
                        </div>
                        <button onClick={() => setLoggedIn(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 14 }} title="Uitloggen">↩</button>
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