import { useState, createContext, useContext, useCallback, useEffect, useRef } from "react";
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

// ── CSV helpers ───────────────────────────────────────────────────────────────
const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        const values = [];
        let current = '', inQuotes = false;
        for (const char of line) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(current.trim().replace(/^"|"$/g, '')); current = ''; }
            else current += char;
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
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

const escapeCSV = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
};
const locationsToCSV = (locs) => {
    const h = ['location_id','name','address','postcode','latitude','longitude','location_type','google_map_link','last_checked'];
    return [h.join(','), ...locs.map(l => h.map(k => escapeCSV(l[k])).join(','))].join('\n');
};
const servicesToCSV = (svcs) => {
    const h = ['service_id','name','category','type','description','target_group','income_requirement','cost_to_user','access_type','location_id','availability','phone','email','website','keywords','notes','needs_referral','last_checked','last_verified'];
    return [h.join(','), ...svcs.map(s => h.map(k => escapeCSV(s[k])).join(','))].join('\n');
};

// ── Backend API ───────────────────────────────────────────────────────────────
// Calls server.js which physically writes the CSV files to public/
const saveLocationsToServer = async (locs) => {
    try {
        const res = await fetch('http://localhost:3001/api/save-locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csv: locationsToCSV(locs) }),
        });
        return res.ok;
    } catch { return false; }
};
const saveServicesToServer = async (svcs) => {
    try {
        const res = await fetch('http://localhost:3001/api/save-services', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csv: servicesToCSV(svcs) }),
        });
        return res.ok;
    } catch { return false; }
};
const loadCSVFile = async (filename) => {
    try {
        const r = await fetch(`${process.env.PUBLIC_URL}/${filename}`);
        if (!r.ok) throw new Error(r.statusText);
        return await r.text();
    } catch (e) { console.error(e); return ''; }
};
const loadInitialData = async () => {
    const [lcsv, scsv] = await Promise.all([loadCSVFile('locations.csv'), loadCSVFile('services.csv')]);
    return { locations: csvToLocations(lcsv), services: csvToServices(scsv) };
};

// ── DataContext ───────────────────────────────────────────────────────────────
const DataContext = createContext(null);
const useData = () => useContext(DataContext);

const DataProvider = ({ children, initialData, onSaveStatus }) => {
    const [locations, setLocations] = useState(initialData?.locations || []);
    const [services,  setServices]  = useState(initialData?.services  || []);
    const locTimer     = useRef(null);
    const svcTimer     = useRef(null);
    // Count pending CSV loads so we skip saving those — only save real user edits
    const skipLocSave  = useRef(0);
    const skipSvcSave  = useRef(0);

    // Hydrate once real CSV data arrives — flag as a load, not a user edit
    useEffect(() => {
        if (initialData?.locations?.length) {
            skipLocSave.current += 1;
            setLocations(initialData.locations);
        }
        if (initialData?.services?.length) {
            skipSvcSave.current += 1;
            setServices(initialData.services);
        }
    }, [initialData]);

    // Save locations — but skip the first effect fired by CSV hydration
    useEffect(() => {
        if (skipLocSave.current > 0) { skipLocSave.current -= 1; return; }
        if (!locations.length) return;
        clearTimeout(locTimer.current);
        locTimer.current = setTimeout(async () => {
            onSaveStatus('saving');
            const ok = await saveLocationsToServer(locations);
            onSaveStatus(ok ? 'saved' : 'error');
        }, 600);
        return () => clearTimeout(locTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locations]);

    // Save services — but skip the first effect fired by CSV hydration
    useEffect(() => {
        if (skipSvcSave.current > 0) { skipSvcSave.current -= 1; return; }
        if (!services.length) return;
        clearTimeout(svcTimer.current);
        svcTimer.current = setTimeout(async () => {
            onSaveStatus('saving');
            const ok = await saveServicesToServer(services);
            onSaveStatus(ok ? 'saved' : 'error');
        }, 600);
        return () => clearTimeout(svcTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [services]);

    const addLocation = useCallback((loc) => {
        setLocations(prev => {
            const nums = prev.map(l => parseInt(l.location_id.replace('LOC', ''), 10));
            const next = Math.max(...nums, 0) + 1;
            return [...prev, { ...loc, location_id: `LOC${String(next).padStart(3,'0')}`, last_checked: new Date().toISOString() }];
        });
    }, []);
    const updateLocation = useCallback((loc) => {
        setLocations(prev => prev.map(l => l.location_id === loc.location_id ? { ...loc, last_checked: new Date().toISOString() } : l));
    }, []);
    const deleteLocation = useCallback((id) => {
        setLocations(prev => prev.filter(l => l.location_id !== id));
    }, []);

    const addService = useCallback((svc) => {
        setServices(prev => {
            const nums = prev.map(s => parseInt(s.service_id.replace('SRV', ''), 10));
            const next = Math.max(...nums, 0) + 1;
            return [...prev, { ...svc, service_id: `SRV${String(next).padStart(3,'0')}`, last_checked: new Date().toISOString(), last_verified: new Date().toISOString() }];
        });
    }, []);
    const updateService = useCallback((svc) => {
        setServices(prev => prev.map(s => s.service_id === svc.service_id ? { ...svc, last_checked: new Date().toISOString(), last_verified: new Date().toISOString() } : s));
    }, []);
    const deleteService = useCallback((id) => {
        setServices(prev => prev.filter(s => s.service_id !== id));
    }, []);
    const verifyService = useCallback((id) => {
        setServices(prev => prev.map(s => s.service_id === id ? { ...s, last_verified: new Date().toISOString() } : s));
    }, []);

    return (
        <DataContext.Provider value={{ locations, services, addLocation, updateLocation, deleteLocation, addService, updateService, deleteService, verifyService }}>
            {children}
        </DataContext.Provider>
    );
};

// ── UI atoms ──────────────────────────────────────────────────────────────────
const SIX_MONTHS = 6 * 30 * 86400000;
const isStale    = (svc) => Date.now() - new Date(svc.last_verified || 0).getTime() > SIX_MONTHS;
const formatDate = (iso) => {
    const d = new Date(iso), now = new Date();
    const mins = Math.floor((now - d) / 60000);
    if (mins < 60)  return `${mins} min geleden`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs} uur geleden`;
    return `${Math.floor(hrs / 24)} dagen geleden`;
};

const Badge = ({ label, style }) => (
    <span style={{ display:"inline-block", fontSize:11, fontWeight:500, padding:"2px 8px", borderRadius:T.radiusLg, whiteSpace:"nowrap", ...style }}>{label}</span>
);
const CategoryBadge = ({ cat }) => { const c = categoryColors[cat] || { bg:T.surface2, text:T.textSecondary }; return <Badge label={cat} style={{ background:c.bg, color:c.text }} />; };
const AccessBadge   = ({ at })  => { const c = accessColors[at]   || { bg:T.surface2, text:T.textSecondary }; return <Badge label={at}  style={{ background:c.bg, color:c.text }} />; };
const LocTypeBadge  = ({ lt })  => { const c = locTypeColors[lt]  || { bg:T.surface2, text:T.textSecondary }; return <Badge label={lt}  style={{ background:c.bg, color:c.text }} />; };

const Field = ({ label, children }) => (
    <div style={{ marginBottom:14 }}>
        <label style={{ display:"block", fontSize:12, fontWeight:500, color:T.textSecondary, marginBottom:4 }}>{label}</label>
        {children}
    </div>
);
const inputStyle = { width:"100%", boxSizing:"border-box", height:34, padding:"0 10px", fontSize:13, borderRadius:T.radiusSm, border:`1px solid ${T.border}`, background:T.surface, color:T.textPrimary, outline:"none", fontFamily:"'Outfit',system-ui,sans-serif" };
const Input    = ({ value, onChange, placeholder, type="text" }) => <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />;
const Select   = ({ value, onChange, options }) => <select value={value} onChange={e=>onChange(e.target.value)} style={{ ...inputStyle, height:34 }}>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>;
const Textarea = ({ value, onChange, rows=3 }) => <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} style={{ ...inputStyle, height:"auto", padding:"6px 10px", resize:"vertical" }} />;

const DropdownMultiSelect = ({ value, onChange, options, placeholder="Selecteer..." }) => {
    const selected = value ? String(value).split(',').map(s=>s.trim()).filter(Boolean) : [];
    return (
        <div>
            {selected.length > 0 && (
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
                    {selected.map(sel => {
                        const opt = options.find(o=>String(o.value)===sel);
                        return (
                            <div key={sel} style={{ display:"flex", alignItems:"center", background:T.surface2, border:`1px solid ${T.border}`, padding:"2px 8px", borderRadius:12, fontSize:12 }}>
                                <span>{opt ? opt.label : sel}</span>
                                <button onClick={()=>onChange(selected.filter(v=>v!==sel).join(', '))} style={{ background:"none", border:"none", cursor:"pointer", marginLeft:6, color:T.textMuted, fontSize:14, padding:0 }}>×</button>
                            </div>
                        );
                    })}
                </div>
            )}
            <select value="" onChange={e=>{ if(!e.target.value) return; if(!selected.includes(e.target.value)) onChange([...selected,e.target.value].join(', ')); }} style={{ ...inputStyle, height:34 }}>
                <option value="">{placeholder}</option>
                {options.filter(o=>!selected.includes(String(o.value))).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
};

const Btn = ({ onClick, variant="primary", children, small }) => {
    const base = { border:"none", borderRadius:T.radiusSm, cursor:"pointer", fontWeight:500, whiteSpace:"nowrap", fontFamily:T.fontBody };
    const s = {
        primary:   { ...base, background:T.accent, color:T.bg,          padding: small?"5px 12px":"7px 16px", fontSize: small?12:13 },
        secondary: { ...base, background:T.surface2,    color:T.textPrimary, border:`1px solid ${T.border}`, padding: small?"5px 12px":"7px 16px", fontSize: small?12:13 },
        danger:    { ...base, background:T.accentLight, color:T.accent,      border:`1px solid #f0c4b8`, padding: small?"5px 12px":"7px 16px", fontSize: small?12:13 },
    };
    return <button onClick={onClick} style={s[variant]}>{children}</button>;
};

const Modal = ({ open, onClose, title, children, wide }) => {
    if (!open) return null;
    return (
        <div style={{ position:"fixed", inset:0, background:"rgba(26,23,20,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
             onClick={e=>e.target===e.currentTarget&&onClose()}>
            <div style={{ background:T.surface, borderRadius:T.radiusMd, border:`1px solid ${T.border}`, width:"100%", maxWidth:wide?720:520, maxHeight:"90vh", overflow:"auto", boxShadow:T.shadowLg }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:15, fontWeight:600 }}>{title}</span>
                    <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:20, color:T.textMuted }}>×</button>
                </div>
                <div style={{ padding:20 }}>{children}</div>
            </div>
        </div>
    );
};

// Save status pill shown in sidebar
const SaveStatus = ({ status }) => {
    if (status === 'idle') return null;
    const map = {
        saving: { text:"Opslaan…",            color:T.textMuted, dot:"#f59e0b" },
        saved:  { text:"CSV opgeslagen ✓",    color:"#2d6b27",   dot:"#2d6b27" },
        error:  { text:"Server niet bereikbaar", color:T.accent, dot:T.accent  },
    };
    const m = map[status];
    return (
        <div style={{ fontSize:11, color:m.color, display:"flex", alignItems:"center", gap:5, marginBottom:8 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:m.dot, display:"inline-block", flexShrink:0 }} />
            <span>{m.text}</span>
            {status==='error' && <span style={{ color:T.textMuted }}>– run <code style={{ background:T.surface2, padding:"0 4px", borderRadius:3 }}>node server.js</code></span>}
        </div>
    );
};

// ── Forms ─────────────────────────────────────────────────────────────────────
const LocationForm = ({ loc, locations=[], onSave, onClose }) => {
    const empty = { name:"", address:"", postcode:"", latitude:"", longitude:"", location_type:"Buurthuis", google_map_link:"", _customType:"" };
    const [form, setForm] = useState(loc ? { ...loc, _customType:"" } : empty);
    const set = k => v => setForm(f=>({...f,[k]:v}));
    const defaultTypes = ["Buurthuis","Wijkcentrum","Gezondheidscentrum","Bibliotheek","Gemeentehuis","Sporthal","Voedselbank","Jeugdhuis","government","organization","hub"];
    const uniqueTypes  = [...new Set([...defaultTypes, ...locations.map(l=>l.location_type).filter(Boolean)])].filter(t=>t!=="__NEW__").sort();
    const typeOpts     = uniqueTypes.map(t=>({ value:t, label:t }));
    typeOpts.push({ value:"__NEW__", label:"+ Nieuw type…" });
    if (form.location_type && form.location_type!=="__NEW__" && !uniqueTypes.includes(form.location_type))
        typeOpts.unshift({ value:form.location_type, label:form.location_type });
    return (
        <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div style={{ gridColumn:"1/-1" }}><Field label="Naam"><Input value={form.name} onChange={set("name")} placeholder="Naam locatie" /></Field></div>
                <div style={{ gridColumn:"1/-1" }}><Field label="Adres"><Input value={form.address} onChange={set("address")} placeholder="Straat + huisnummer" /></Field></div>
                <div style={{ gridColumn:"1/-1" }}><Field label="Google Maps Link"><Input value={form.google_map_link} onChange={set("google_map_link")} placeholder="https://maps.google.com/…" /></Field></div>
                <Field label="Postcode"><Input value={form.postcode} onChange={set("postcode")} placeholder="2312 AB" /></Field>
                <Field label="Type">
                    <Select value={form.location_type} onChange={set("location_type")} options={typeOpts} />
                    {form.location_type==="__NEW__" && <div style={{ marginTop:8 }}><Input value={form._customType} onChange={set("_customType")} placeholder="Typ nieuw type…" /></div>}
                </Field>
                <Field label="Breedtegraad"><Input value={form.latitude}  onChange={set("latitude")}  placeholder="52.1601" /></Field>
                <Field label="Lengtegraad"> <Input value={form.longitude} onChange={set("longitude")} placeholder="4.4970"  /></Field>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
                <Btn variant="secondary" onClick={onClose}>Annuleren</Btn>
                <Btn onClick={()=>{ const f={...form}; if(f.location_type==="__NEW__") f.location_type=f._customType||"Overig"; delete f._customType; onSave(f); onClose(); }}>Opslaan</Btn>
            </div>
        </div>
    );
};

const ServiceForm = ({ svc, locations, onSave, onClose }) => {
    const empty = { name:"", category:"Gezondheid en zorg", description:"", target_group:"", income_requirement:"Geen", cost_to_user:"Gratis", access_type:"walkin", location_id:locations[0]?.location_id||"", availability:"", phone:"", email:"", website:"", needs_referral:false, keywords:"", notes:"" };
    const [form, setForm] = useState(svc ? { ...svc } : empty);
    const set = k => v => setForm(f=>({...f,[k]:v}));
    const cats     = ["Hulp bij schulden","Kinderen en opgroeien","Gezondheid en zorg","Studeren en werken","Wonen en energie besparen","Onkosten en dagelijks leven"].map(c=>({value:c,label:c}));
    const types    = ["Ondersteuning","Regeling","Informatie"].map(t=>({value:t,label:t}));
    const accesses = ["walkin","appointment","phone","online","home_visit","referral_only"].map(a=>({value:a,label:a}));
    const locOpts  = locations.map(l=>({ value:l.location_id, label:`${l.location_id} — ${l.name}` }));
    return (
        <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div style={{ gridColumn:"1/-1" }}><Field label="Naam dienst"><Input value={form.name} onChange={set("name")} placeholder="Naam" /></Field></div>
                <Field label="Categorie"><Select value={form.category} onChange={set("category")} options={cats} /></Field>
                <Field label="Type"><DropdownMultiSelect value={form.type} onChange={set("type")} options={types} placeholder="+ Type toevoegen…" /></Field>
                <div style={{ gridColumn:"1/-1" }}><Field label="Omschrijving"><Textarea value={form.description} onChange={set("description")} /></Field></div>
                <Field label="Doelgroep"><Input value={form.target_group} onChange={set("target_group")} placeholder="bijv. Alle inwoners" /></Field>
                <Field label="Inkomensvereiste"><Input value={form.income_requirement} onChange={set("income_requirement")} /></Field>
                <Field label="Kosten gebruiker"><Input value={form.cost_to_user} onChange={set("cost_to_user")} /></Field>
                <div style={{ gridColumn:"1/-1" }}><Field label="Toegangstype"><DropdownMultiSelect value={form.access_type} onChange={set("access_type")} options={accesses} placeholder="+ Toegang toevoegen…" /></Field></div>
                <div style={{ gridColumn:"1/-1" }}><Field label="Locatie(s)"><DropdownMultiSelect value={form.location_id} onChange={set("location_id")} options={locOpts} placeholder="+ Locatie toevoegen…" /></Field></div>
                <Field label="Beschikbaarheid"><Input value={form.availability} onChange={set("availability")} placeholder="bijv. Ma–Vr 9:00–17:00" /></Field>
                <Field label="Telefoon"><Input value={form.phone} onChange={set("phone")} placeholder="071-…" /></Field>
                <Field label="E-mail"><Input value={form.email} onChange={set("email")} placeholder="info@…" /></Field>
                <Field label="Website"><Input value={form.website} onChange={set("website")} placeholder="https://…" /></Field>
                <div style={{ gridColumn:"1/-1" }}><Field label="Trefwoorden"><Input value={form.keywords} onChange={set("keywords")} /></Field></div>
                <div style={{ gridColumn:"1/-1" }}><Field label="Notities"><Textarea value={form.notes} onChange={set("notes")} rows={2} /></Field></div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <input type="checkbox" id="ref" checked={form.needs_referral} onChange={e=>set("needs_referral")(e.target.checked)} />
                    <label htmlFor="ref" style={{ fontSize:13 }}>Verwijzing nodig</label>
                </div>
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:16 }}>
                <Btn variant="secondary" onClick={onClose}>Annuleren</Btn>
                <Btn onClick={()=>{ onSave(form); onClose(); }}>Opslaan</Btn>
            </div>
        </div>
    );
};

// ── Pages ─────────────────────────────────────────────────────────────────────
const OverviewPage = () => {
    const { locations, services } = useData();
    const sevenDaysAgo  = new Date(Date.now() - 7*86400000);
    const recentChanges = [...locations,...services].filter(r=>new Date(r.last_checked)>=sevenDaysAgo).length;
    const staleCount    = services.filter(isStale).length;
    const stats = [
        { label:"Totaal Locaties",      value:locations.length, sub:"In de database" },
        { label:"Totaal Diensten",       value:services.length,  sub:"Beschikbare services" },
        { label:"Updates (7 dagen)",     value:recentChanges,    sub:"Recente wijzigingen" },
        { label:"Verlopen verificaties", value:staleCount,       sub:"Ouder dan 6 maanden", warn:staleCount>0 },
    ];
    const recent = [
        ...locations.map(l=>({ id:l.location_id, name:l.name, type:"Locatie", last_checked:l.last_checked })),
        ...services.map(s =>({ id:s.service_id,  name:s.name, type:"Dienst",  last_checked:s.last_checked })),
    ].sort((a,b)=>new Date(b.last_checked)-new Date(a.last_checked)).slice(0,6);
    return (
        <div>
            <div style={{ marginBottom:24 }}>
                <h1 style={{ fontSize:22, fontWeight:600, margin:"0 0 4px", fontFamily:T.fontDisplay }}>Overview</h1>
                <p style={{ color:T.textSecondary, fontSize:13, margin:0 }}>Welkom terug, Admin.</p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
                {stats.map(s=>(
                    <div key={s.label} style={{ background:s.warn?T.accentLight:T.surface, border:`1px solid ${s.warn?"#f0c4b8":T.border}`, borderRadius:T.radiusMd, padding:"14px 16px", boxShadow:T.shadowSm }}>
                        <div style={{ fontSize:11, fontWeight:500, color:s.warn?T.accent:T.textMuted, marginBottom:4 }}>{s.label}</div>
                        <div style={{ fontSize:26, fontWeight:700, color:s.warn?T.accent:T.textPrimary }}>{s.value}</div>
                        <div style={{ fontSize:11, color:s.warn?T.accent:T.textMuted, marginTop:2 }}>{s.sub}</div>
                    </div>
                ))}
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusMd, overflow:"hidden", boxShadow:T.shadowSm }}>
                <div style={{ padding:"14px 16px", borderBottom:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:14, fontWeight:600 }}>Recente activiteit</span>
                </div>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead><tr style={{ background:T.surface2 }}>
                        {["Naam","Type","Gecontroleerd"].map(h=><th key={h} style={{ textAlign:"left", padding:"8px 14px", fontSize:11, fontWeight:600, color:T.textMuted, borderBottom:`1px solid ${T.border}` }}>{h}</th>)}
                    </tr></thead>
                    <tbody>{recent.map(r=>(
                        <tr key={r.id} style={{ borderBottom:`1px solid ${T.border}` }}>
                            <td style={{ padding:"9px 14px", fontWeight:500 }}>{r.name}</td>
                            <td style={{ padding:"9px 14px" }}><Badge label={r.type} style={{ background:r.type==="Locatie"?"#e5eaff":"#ede8f5", color:r.type==="Locatie"?"#1a2eaa":"#3d1f6b" }} /></td>
                            <td style={{ padding:"9px 14px", color:T.textMuted }}>{formatDate(r.last_checked)}</td>
                        </tr>
                    ))}</tbody>
                </table>
            </div>
        </div>
    );
};

const LocationsPage = () => {
    const { locations, addLocation, updateLocation, deleteLocation } = useData();
    const [search,     setSearch]     = useState("");
    const [filterType, setFilterType] = useState("all");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editLoc,    setEditLoc]    = useState(null);
    const [confirmDel, setConfirmDel] = useState(null);
    const types    = [...new Set(locations.map(l=>l.location_type))].sort();
    const filtered = locations.filter(l=>{
        if (filterType!=="all" && l.location_type!==filterType) return false;
        if (search) return [l.name,l.location_id,l.address,l.postcode,l.location_type].join(" ").toLowerCase().includes(search.toLowerCase());
        return true;
    });
    return (
        <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <div>
                    <h1 style={{ fontSize:22, fontWeight:600, margin:"0 0 2px", fontFamily:T.fontDisplay }}>Locaties</h1>
                    <p style={{ color:T.textSecondary, fontSize:13, margin:0 }}>Beheer alle locaties in de database</p>
                </div>
                <Btn onClick={()=>{ setEditLoc(null); setDialogOpen(true); }}>+ Nieuwe locatie</Btn>
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusMd, overflow:"hidden", boxShadow:T.shadowSm }}>
                <div style={{ display:"flex", gap:10, padding:14, borderBottom:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Zoek locatie…"
                           style={{ flex:1, minWidth:160, height:32, padding:"0 10px", fontSize:13, borderRadius:T.radiusSm, border:`1px solid ${T.border}`, background:T.surface2, outline:"none" }} />
                    <select value={filterType} onChange={e=>setFilterType(e.target.value)}
                            style={{ height:32, padding:"0 8px", fontSize:13, borderRadius:T.radiusSm, border:`1px solid ${T.border}`, background:T.surface2 }}>
                        <option value="all">Alle types</option>
                        {types.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                        <thead><tr style={{ background:T.surface2 }}>
                            {["Naam","Adres","Google Maps","Postcode","Type","Gecontroleerd",""].map((h,i)=>(
                                <th key={i} style={{ textAlign:"left", padding:"8px 12px", fontSize:11, fontWeight:600, color:T.textMuted, borderBottom:`1px solid ${T.border}` }}>{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                        {filtered.map(l=>(
                            <tr key={l.location_id} style={{ borderBottom:`1px solid ${T.border}`, cursor:"pointer" }}
                                onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                                onMouseLeave={e=>e.currentTarget.style.background=""}>
                                <td onClick={()=>{ setEditLoc(l); setDialogOpen(true); }} style={{ padding:"9px 12px", fontWeight:500 }}>{l.name}</td>
                                <td onClick={()=>{ setEditLoc(l); setDialogOpen(true); }} style={{ padding:"9px 12px", color:T.textSecondary }}>{l.address}</td>
                                <td style={{ padding:"9px 12px" }}>
                                    {l.google_map_link ? <a href={l.google_map_link} target="_blank" rel="noreferrer" style={{ color:T.accent, textDecoration:"none" }}>Link ↗</a> : <span style={{ color:T.textMuted }}>—</span>}
                                </td>
                                <td onClick={()=>{ setEditLoc(l); setDialogOpen(true); }} style={{ padding:"9px 12px", fontFamily:"monospace", fontSize:12, color:T.textSecondary }}>{l.postcode}</td>
                                <td onClick={()=>{ setEditLoc(l); setDialogOpen(true); }} style={{ padding:"9px 12px" }}><LocTypeBadge lt={l.location_type} /></td>
                                <td onClick={()=>{ setEditLoc(l); setDialogOpen(true); }} style={{ padding:"9px 12px", color:T.textMuted }}>{formatDate(l.last_checked)}</td>
                                <td style={{ padding:"9px 12px", textAlign:"right" }}>
                                    {confirmDel===l.location_id ? (
                                        <span style={{ display:"inline-flex", gap:4 }}>
                                            <button onClick={()=>{ deleteLocation(l.location_id); setConfirmDel(null); }} style={{ background:T.accent, color:"#fff", border:"none", borderRadius:T.radiusSm, padding:"3px 8px", fontSize:11, cursor:"pointer" }}>Verwijder</button>
                                            <button onClick={()=>setConfirmDel(null)} style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, padding:"3px 8px", fontSize:11, cursor:"pointer" }}>Annuleer</button>
                                        </span>
                                    ) : (
                                        <button onClick={()=>setConfirmDel(l.location_id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.textMuted, fontSize:15, padding:"2px 6px" }}>✕</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filtered.length===0 && <tr><td colSpan={7} style={{ padding:"24px 12px", textAlign:"center", color:T.textMuted }}>Geen locaties gevonden</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div style={{ padding:"10px 14px", borderTop:`1px solid ${T.border}`, fontSize:12, color:T.textMuted }}>{filtered.length} locaties</div>
            </div>
            <Modal open={dialogOpen} onClose={()=>setDialogOpen(false)} title={editLoc?"Locatie bewerken":"Nieuwe locatie"}>
                <LocationForm loc={editLoc} locations={locations} onClose={()=>setDialogOpen(false)}
                              onSave={form=>editLoc?updateLocation(form):addLocation(form)} />
            </Modal>
        </div>
    );
};

const ServicesPage = () => {
    const { services, locations, addService, updateService, deleteService, verifyService } = useData();
    const [search,       setSearch]       = useState("");
    const [filterCat,    setFilterCat]    = useState("all");
    const [filterAccess, setFilterAccess] = useState("all");
    const [page,         setPage]         = useState(0);
    const [dialogOpen,   setDialogOpen]   = useState(false);
    const [editSvc,      setEditSvc]      = useState(null);
    const [confirmDel,   setConfirmDel]   = useState(null);
    const PER_PAGE = 8;
    const cats     = [...new Set(services.flatMap(s=>String(s.category||"").split(',').map(x=>x.trim()).filter(Boolean)))].sort();
    const accesses = [...new Set(services.flatMap(s=>String(s.access_type||"").split(',').map(x=>x.trim()).filter(Boolean)))].sort();
    const filtered = services.filter(s=>{
        if (filterCat!=="all" && !String(s.category||"").split(',').map(x=>x.trim()).includes(filterCat)) return false;
        if (filterAccess!=="all" && !String(s.access_type||"").split(',').map(x=>x.trim()).includes(filterAccess)) return false;
        if (search) return [s.name,s.service_id,s.category,s.type,s.target_group,s.keywords].join(" ").toLowerCase().includes(search.toLowerCase());
        return true;
    });
    const totalPages = Math.ceil(filtered.length/PER_PAGE);
    const paged      = filtered.slice(page*PER_PAGE,(page+1)*PER_PAGE);
    return (
        <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <div>
                    <h1 style={{ fontSize:22, fontWeight:600, margin:"0 0 2px", fontFamily:T.fontDisplay }}>Diensten</h1>
                    <p style={{ color:T.textSecondary, fontSize:13, margin:0 }}>Beheer alle diensten in de database</p>
                </div>
                <Btn onClick={()=>{ setEditSvc(null); setDialogOpen(true); }}>+ Nieuwe dienst</Btn>
            </div>
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusMd, overflow:"hidden", boxShadow:T.shadowSm }}>
                <div style={{ display:"flex", gap:10, padding:14, borderBottom:`1px solid ${T.border}`, flexWrap:"wrap" }}>
                    <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(0); }} placeholder="Zoek op naam, ID, trefwoord…"
                           style={{ flex:1, minWidth:180, height:32, padding:"0 10px", fontSize:13, borderRadius:T.radiusSm, border:`1px solid ${T.border}`, background:T.surface2, outline:"none" }} />
                    <select value={filterCat} onChange={e=>{ setFilterCat(e.target.value); setPage(0); }}
                            style={{ height:32, padding:"0 8px", fontSize:13, borderRadius:T.radiusSm, border:`1px solid ${T.border}`, background:T.surface2 }}>
                        <option value="all">Alle categorieën</option>
                        {cats.map(c=><option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={filterAccess} onChange={e=>{ setFilterAccess(e.target.value); setPage(0); }}
                            style={{ height:32, padding:"0 8px", fontSize:13, borderRadius:T.radiusSm, border:`1px solid ${T.border}`, background:T.surface2 }}>
                        <option value="all">Alle toegang</option>
                        {accesses.map(a=><option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                        <thead><tr style={{ background:T.surface2 }}>
                            {["","Naam","Categorie","Type","Kosten","Toegang","Gecontroleerd",""].map((h,i)=>(
                                <th key={i} style={{ textAlign:"left", padding:"8px 12px", fontSize:11, fontWeight:600, color:T.textMuted, borderBottom:`1px solid ${T.border}` }}>{h}</th>
                            ))}
                        </tr></thead>
                        <tbody>
                        {paged.map(s=>(
                            <tr key={s.service_id} style={{ borderBottom:`1px solid ${T.border}`, cursor:"pointer" }}
                                onMouseEnter={e=>e.currentTarget.style.background=T.surface2}
                                onMouseLeave={e=>e.currentTarget.style.background=""}>
                                <td style={{ padding:"8px 10px 8px 14px", width:24 }}>
                                    {isStale(s) ? (
                                        <button onClick={e=>{ e.stopPropagation(); verifyService(s.service_id); }} title="Verificatie verlopen"
                                                style={{ background:T.accentLight, border:"none", borderRadius:T.radiusSm, width:22, height:22, cursor:"pointer", fontSize:12, color:T.accent }}>!</button>
                                    ) : <span style={{ color:"#2d6b27", fontSize:14 }}>✓</span>}
                                </td>
                                <td onClick={()=>{ setEditSvc(s); setDialogOpen(true); }} style={{ padding:"8px 12px", fontWeight:500 }}>{s.name}</td>
                                <td onClick={()=>{ setEditSvc(s); setDialogOpen(true); }} style={{ padding:"8px 12px" }}><CategoryBadge cat={s.category} /></td>
                                <td onClick={()=>{ setEditSvc(s); setDialogOpen(true); }} style={{ padding:"8px 12px", color:T.textSecondary }}>{s.type}</td>
                                <td onClick={()=>{ setEditSvc(s); setDialogOpen(true); }} style={{ padding:"8px 12px", color:T.textSecondary }}>{s.cost_to_user}</td>
                                <td onClick={()=>{ setEditSvc(s); setDialogOpen(true); }} style={{ padding:"8px 12px" }}><AccessBadge at={s.access_type} /></td>
                                <td onClick={()=>{ setEditSvc(s); setDialogOpen(true); }} style={{ padding:"8px 12px", color:T.textMuted }}>{formatDate(s.last_checked)}</td>
                                <td style={{ padding:"8px 12px", textAlign:"right" }}>
                                    {confirmDel===s.service_id ? (
                                        <span style={{ display:"inline-flex", gap:4 }}>
                                            <button onClick={()=>{ deleteService(s.service_id); setConfirmDel(null); }} style={{ background:T.accent, color:"#fff", border:"none", borderRadius:T.radiusSm, padding:"3px 8px", fontSize:11, cursor:"pointer" }}>Verwijder</button>
                                            <button onClick={()=>setConfirmDel(null)} style={{ background:T.surface2, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, padding:"3px 8px", fontSize:11, cursor:"pointer" }}>Annuleer</button>
                                        </span>
                                    ) : (
                                        <button onClick={()=>setConfirmDel(s.service_id)} style={{ background:"none", border:"none", cursor:"pointer", color:T.textMuted, fontSize:15, padding:"2px 6px" }}>✕</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {paged.length===0 && <tr><td colSpan={8} style={{ padding:"24px 12px", textAlign:"center", color:T.textMuted }}>Geen diensten gevonden</td></tr>}
                        </tbody>
                    </table>
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderTop:`1px solid ${T.border}` }}>
                    <span style={{ fontSize:12, color:T.textMuted }}>{filtered.length} resultaten</span>
                    {totalPages>1 && (
                        <div style={{ display:"flex", gap:4 }}>
                            {Array.from({ length:totalPages },(_,i)=>(
                                <button key={i} onClick={()=>setPage(i)}
                                        style={{ width:28, height:28, borderRadius:T.radiusSm, border:`1px solid ${i===page?T.textPrimary:T.border}`, background:i===page?T.textPrimary:"transparent", color:i===page?T.bg:T.textPrimary, cursor:"pointer", fontSize:12 }}>
                                    {i+1}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <Modal open={dialogOpen} onClose={()=>setDialogOpen(false)} title={editSvc?"Dienst bewerken":"Nieuwe dienst"} wide>
                <ServiceForm svc={editSvc} locations={locations} onClose={()=>setDialogOpen(false)}
                             onSave={form=>editSvc?updateService(form):addService(form)} />
            </Modal>
        </div>
    );
};

// ── Login ─────────────────────────────────────────────────────────────────────
const LoginPage = ({ onLogin }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState("");
    const [pass, setPass] = useState("");
    const [show, setShow] = useState(false);
    return (
        <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:T.bg, padding:16 }}>
            <link rel="stylesheet" href={GOOGLE_FONTS} />
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.radiusMd, width:"100%", maxWidth:380, padding:32, boxShadow:T.shadowMd }}>
                <div style={{ textAlign:"center", marginBottom:28 }}>
                    <div style={{ width:44, height:44, background:T.textPrimary, borderRadius:T.radiusSm, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                        <span style={{ color:T.bg, fontSize:18 }}>⬡</span>
                    </div>
                    <h2 style={{ fontSize:22, fontWeight:600, margin:"0 0 4px", fontFamily:T.fontDisplay }}>Beheer inloggen</h2>
                    <p style={{ fontSize:13, color:T.textMuted, margin:0 }}>Meld u aan om het beheerpaneel te openen</p>
                </div>
                <div style={{ marginBottom:14 }}>
                    <label style={{ display:"block", fontSize:12, fontWeight:500, color:T.textSecondary, marginBottom:4 }}>Gebruikersnaam</label>
                    <input value={user} onChange={e=>setUser(e.target.value)} placeholder="admin"
                           style={{ width:"100%", boxSizing:"border-box", height:36, padding:"0 10px", fontSize:13, borderRadius:T.radiusSm, border:`1px solid ${T.border}`, outline:"none" }} />
                </div>
                <div style={{ marginBottom:20 }}>
                    <label style={{ display:"block", fontSize:12, fontWeight:500, color:T.textSecondary, marginBottom:4 }}>Wachtwoord</label>
                    <div style={{ position:"relative" }}>
                        <input type={show?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••"
                               style={{ width:"100%", boxSizing:"border-box", height:36, padding:"0 36px 0 10px", fontSize:13, borderRadius:T.radiusSm, border:`1px solid ${T.border}`, outline:"none" }} />
                        <button onClick={()=>setShow(!show)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:T.textMuted }}>
                            {show?"🙈":"👁"}
                        </button>
                    </div>
                </div>
                <button onClick={onLogin} style={{ width:"100%", height:36, background:T.accent, color:T.bg, border:"none", borderRadius:T.radiusSm, fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:10 }}>
                    Inloggen
                </button>
                <button onClick={()=>navigate("/")} style={{ width:"100%", height:36, background:"transparent", color:T.textSecondary, border:`1px solid ${T.border}`, borderRadius:T.radiusSm, fontSize:13, cursor:"pointer" }}>
                    ← Terug naar hoofdmenu
                </button>
            </div>
        </div>
    );
};

// ── Root ──────────────────────────────────────────────────────────────────────
export default function DBManager() {
    const navigate    = useNavigate();
    const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem('dbadmin_auth') === '1');
    const [page,        setPage]        = useState("overview");
    const [initialData, setInitialData] = useState({ locations:[], services:[] });
    const [saveStatus,  setSaveStatus]  = useState("idle");

    useEffect(() => {
        loadInitialData()
            .then(data=>setInitialData(data))
            .catch(err=>console.error("CSV load error:", err));
    }, []);

    useEffect(() => {
        if (saveStatus==='saved') {
            const t = setTimeout(()=>setSaveStatus('idle'), 2500);
            return ()=>clearTimeout(t);
        }
    }, [saveStatus]);

    if (!loggedIn) return <LoginPage onLogin={()=>{ sessionStorage.setItem('dbadmin_auth','1'); setLoggedIn(true); }} />;

    const navItems = [
        { id:"overview",  label:"Overview", icon:"⊞" },
        { id:"locations", label:"Locaties",  icon:"◎" },
        { id:"services",  label:"Diensten",  icon:"◈" },
    ];

    return (
        <DataProvider initialData={initialData} onSaveStatus={setSaveStatus}>
            <link rel="stylesheet" href={GOOGLE_FONTS} />
            <div style={{ display:"flex", height:"100vh", fontFamily:T.fontBody, fontSize:13, background:T.bg, color:T.textPrimary }}>

                {/* Sidebar */}
                <div style={{ width:220, flexShrink:0, background:T.surface, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
                    <div style={{ padding:"16px 16px 12px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:30, height:30, background:T.textPrimary, borderRadius:T.radiusSm, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:T.bg }}>⬡</div>
                        <span style={{ fontFamily:T.fontDisplay, fontWeight:600, fontSize:15 }}>Locations Manager</span>
                    </div>
                    <nav style={{ flex:1, padding:"12px 8px" }}>
                        {navItems.map(item=>(
                            <button key={item.id} onClick={()=>setPage(item.id)}
                                    style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:T.radiusSm, border:"none", cursor:"pointer", textAlign:"left", fontSize:13, marginBottom:2, background:page===item.id?T.surface2:"transparent", color:page===item.id?T.textPrimary:T.textMuted, fontWeight:page===item.id?600:400 }}>
                                <span style={{ fontSize:15 }}>{item.icon}</span>
                                {item.label}
                            </button>
                        ))}
                        <button onClick={()=>navigate("/")}
                                style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:T.radiusSm, border:"none", cursor:"pointer", textAlign:"left", fontSize:13, marginTop:8, background:"transparent", color:T.textMuted }}>
                            <span>←</span> Hoofdmenu
                        </button>
                    </nav>
                    <div style={{ padding:"12px 16px", borderTop:`1px solid ${T.border}` }}>
                        <SaveStatus status={saveStatus} />
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                <div style={{ width:28, height:28, background:T.textPrimary, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:T.bg, fontWeight:600 }}>A</div>
                                <div>
                                    <div style={{ fontSize:12, fontWeight:500 }}>Admin User</div>
                                    <div style={{ fontSize:11, color:T.textMuted }}>admin@dbadmin.nl</div>
                                </div>
                            </div>
                            <button onClick={()=>{ sessionStorage.removeItem('dbadmin_auth'); setLoggedIn(false); }} style={{ background:"none", border:"none", cursor:"pointer", color:T.textMuted, fontSize:14 }} title="Uitloggen">↩</button>
                        </div>
                    </div>
                </div>

                {/* Main */}
                <div style={{ flex:1, overflow:"auto" }}>
                    <div style={{ maxWidth:1100, margin:"0 auto", padding:24 }}>
                        {page==="overview"  && <OverviewPage />}
                        {page==="locations" && <LocationsPage />}
                        {page==="services"  && <ServicesPage />}
                    </div>
                </div>

            </div>
        </DataProvider>
    );
}