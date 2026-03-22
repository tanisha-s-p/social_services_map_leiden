import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './SocialMap.css';
import Chatbot from './Chatbot';
import ServiceDetail from './ServiceDetail';
import { createLeafletIcon } from './MapPin';
import {
    CATEGORY_COLORS,
    CATEGORIES,
    ACCESS_LABELS,
    LOC_TYPE_COLORS,
    LOC_TYPE_LABELS,
    getCategoryColor,
    parseCategories,
    parseKeywords,
    parseAccessType,
} from './utils';

delete L.Icon.Default.prototype._getIconUrl;

const ACCESS_ICONS = {
    walkin:        '🚶',
    appointment:   '📅',
    home_visit:    '🏠',
    online:        '💻',
    phone:         '📞',
    referral_only: '📋',
};

function parseCsv(text) {
    return new Promise((resolve, reject) => {
        Papa.parse(text, {
            header:         true,
            skipEmptyLines: true,
            complete:       (r) => resolve(r.data),
            error:          reject,
        });
    });
}

// Flies the map to a position
function MapController({ flyTo }) {
    const map = useMap();
    useEffect(() => {
        if (flyTo) {
            map.flyTo(flyTo, 17, { animate: true, duration: 0.8 });
        }
    }, [flyTo, map]);
    return null;
}

function buildData(rawServices, rawLocations) {
    const locMap = {};
    rawLocations.forEach((loc) => {
        locMap[loc.location_id?.trim()] = {
            ...loc,
            latitude:      parseFloat(loc.latitude)  || 0,
            longitude:     parseFloat(loc.longitude) || 0,
            location_type: loc.location_type?.trim() || 'organization',
        };
    });

    const enriched = rawServices.map((s) => {
        const cats       = parseCategories(s.category);
        const kws        = parseKeywords(s.keywords);
        const accessType = parseAccessType(s.access_type);

        const locIds    = (s.location_id || '').split(',').map((id) => id.trim()).filter(Boolean);
        const primaryLoc = locIds.length > 0 ? locMap[locIds[0]] : null;

        let age_min = 0, age_max = 99;
        const tg = (s.target_group || '').toLowerCase();
        if (tg.includes('18 jaar'))                              age_min = 18;
        if (tg.includes('16 jaar'))                              age_min = 16;
        if (tg.includes('jongeren') || tg.includes('30 jaar of jonger')) age_max = 30;
        if (tg.includes('65+') || tg.includes('ouderen'))        age_min = 65;
        if (tg.includes('kinderen') && !tg.includes('met kinderen')) age_max = 18;

        return {
            ...s,
            _categories:  cats,
            _keywords:    kws,
            _access_type: accessType,
            _loc_ids:     locIds,
            _primary_loc: primaryLoc,
            _lat:         primaryLoc?.latitude  || 0,
            _lng:         primaryLoc?.longitude || 0,
            _loc_type:    primaryLoc?.location_type || '',
            _age_min:     age_min,
            _age_max:     age_max,
        };
    });

    const locWithServices = {};
    rawLocations.forEach((loc) => {
        const id = loc.location_id?.trim();
        if (!id) return;
        locWithServices[id] = {
            ...loc,
            latitude:      parseFloat(loc.latitude)  || 0,
            longitude:     parseFloat(loc.longitude) || 0,
            location_type: loc.location_type?.trim() || 'organization',
            services:      [],
        };
    });

    enriched.forEach((s) => {
        s._loc_ids.forEach((id) => {
            if (locWithServices[id]) {
                locWithServices[id].services.push(s);
            }
        });
    });

    const locations = Object.values(locWithServices).filter(
        (l) => l.latitude && l.longitude,
    );

    return { services: enriched, locations };
}

export default function CustomerApp() {
    const navigate = useNavigate();

    const [services,     setServices]     = useState([]);
    const [locations,    setLocations]    = useState([]);
    const [csvError,     setCsvError]     = useState(false);
    const [dataLoading,  setDataLoading]  = useState(true);

    const [activeTab,        setActiveTab]        = useState('locaties');
    const [searchQuery,      setSearchQuery]      = useState('');
    const [postcode,         setPostcode]         = useState('');
    const [activeCategories, setActiveCategories] = useState([]);
    const [activeTypes,      setActiveTypes]      = useState([]);
    const [showChat,         setShowChat]         = useState(false);
    const [highlightedIds,   setHighlightedIds]   = useState([]);
    const [selectedService,  setSelectedService]  = useState(null);
    const [flyTo,            setFlyTo]            = useState(null);

    const markerRefs = useRef({});

    useEffect(() => {
        Promise.all([
            fetch('/services.csv').then((r) => r.text()),
            fetch('/locations.csv').then((r) => r.text()),
        ])
            .then(([sText, lText]) => Promise.all([parseCsv(sText), parseCsv(lText)]))
            .then(([rawServices, rawLocations]) => {
                const { services: s, locations: l } = buildData(rawServices, rawLocations);
                setServices(s);
                setLocations(l);
                setDataLoading(false);
            })
            .catch(() => {
                setCsvError(true);
                setDataLoading(false);
            });
    }, []);

    const handleLocationCardClick = useCallback((loc) => {
        setFlyTo([loc.latitude, loc.longitude]);
        setTimeout(() => {
            const marker = markerRefs.current[loc.location_id];
            if (marker) marker.openPopup();
        }, 900);
    }, []);

    const handleServiceClick = useCallback((service, suppressFly = false) => {
        setSelectedService(service);
        if (!suppressFly && service._primary_loc?.latitude && service._primary_loc?.longitude) {
            setFlyTo([service._primary_loc.latitude, service._primary_loc.longitude]);
        }
    }, []);

    const handleBackFromDetail = () => setSelectedService(null);

    // ── Filtered services — highlighted ones float to the top ──────────────────
    const filteredServices = services
        .filter((s) => {
            if (activeCategories.length > 0 && !s._categories.some((c) => activeCategories.includes(c)))
                return false;
            if (activeTypes.length > 0 && !activeTypes.includes(s.type)) return false;
            const q = searchQuery.toLowerCase().trim();
            if (q) {
                const match =
                    (s.name        || '').toLowerCase().includes(q) ||
                    (s.description || '').toLowerCase().includes(q) ||
                    s._keywords.some((k) => k.toLowerCase().includes(q)) ||
                    (s.target_group || '').toLowerCase().includes(q);
                if (!match) return false;
            }
            return true;
        })
        .sort((a, b) => {
            const aTop = highlightedIds.includes(a.service_id) ? 0 : 1;
            const bTop = highlightedIds.includes(b.service_id) ? 0 : 1;
            return aTop - bTop;
        });

    const filteredLocations = locations.filter((loc) => {
        if (activeCategories.length > 0) {
            const hasCat = loc.services.some((s) =>
                s._categories.some((c) => activeCategories.includes(c)),
            );
            if (!hasCat) return false;
        }
        const q = searchQuery.toLowerCase().trim();
        if (q) {
            const match =
                (loc.name    || '').toLowerCase().includes(q) ||
                (loc.address || '').toLowerCase().includes(q) ||
                loc.services.some((s) => (s.description || '').toLowerCase().includes(q));
            if (!match) return false;
        }
        return true;
    });

    const toggleCategory = (cat) => {
        setActiveCategories((prev) =>
            prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
        );
    };

    const toggleType = (type) => {
        setActiveTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
        );
    };

    const handleHighlight = (results) => {
        setHighlightedIds(results.map((s) => s.service_id));
        setActiveTab('diensten');
        setSelectedService(null);
    };

    const showDetail = !!selectedService;

    return (
        <div className="app-layout">
            {/* HERO */}
            <header className="hero">
                <div className="hero-brand">
                    <h1 className="hero-title">Sociale Kaart Leiden</h1>
                    <span className="hero-subtitle">
            Hulp en ondersteuning voor inwoners met een laag inkomen
          </span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                        className="hero-chat-btn"
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            color:       'inherit',
                            border:      '1px solid rgba(255,255,255,0.4)',
                        }}
                        onClick={() => navigate('/')}
                    >
                        ← Hoofdmenu
                    </button>
                    <button className="hero-chat-btn" onClick={() => setShowChat(true)}>
                        <span style={{ fontSize: 16 }}>🧭</span>
                        Vraag Ray om hulp
                    </button>
                </div>
            </header>

            {/* MAIN */}
            <div className="main-area">

                {/* LEFT PANEL */}
                <aside className="left-panel">

                    {!showDetail && (
                        <>
                            <div className="search-area">
                                {csvError && (
                                    <div style={{ background: '#fdf0ec', border: '1px solid #f4b8a4', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 13, color: '#c8421e' }}>
                                        ⚠️ Sorry, de diensten konden niet worden geladen.
                                    </div>
                                )}
                                <div className="search-row">
                                    <div className="input-wrap">
                                        <span className="input-icon">🔍</span>
                                        <input
                                            type="text"
                                            className="search-input"
                                            placeholder="Wat heb je nodig?"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        className="postcode-input"
                                        placeholder="Postcode"
                                        value={postcode}
                                        onChange={(e) => setPostcode(e.target.value)}
                                        maxLength={7}
                                    />
                                </div>
                                <div className="filter-row">
                                    {['Regeling', 'Informatie', 'Ondersteuning'].map((t) => (
                                        <button
                                            key={t}
                                            className={`type-chip ${activeTypes.includes(t) ? 'active' : ''}`}
                                            onClick={() => toggleType(t)}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                                <button className="search-btn" onClick={() => {}}>Zoeken</button>
                            </div>

                            <div className="cat-chips">
                                {CATEGORIES.map((cat) => (
                                    <button
                                        key={cat}
                                        className={`cat-chip ${activeCategories.includes(cat) ? 'active' : ''}`}
                                        style={{
                                            background:  activeCategories.includes(cat) ? CATEGORY_COLORS[cat] : 'white',
                                            borderColor: CATEGORY_COLORS[cat],
                                            color:       activeCategories.includes(cat) ? 'white' : CATEGORY_COLORS[cat],
                                        }}
                                        onClick={() => toggleCategory(cat)}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            <div className="tabs">
                                <button
                                    className={`tab-btn ${activeTab === 'locaties' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('locaties')}
                                >
                                    Locaties ({filteredLocations.length})
                                </button>
                                <button
                                    className={`tab-btn ${activeTab === 'diensten' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('diensten')}
                                >
                                    Alle diensten ({filteredServices.length})
                                </button>
                            </div>
                        </>
                    )}

                    {/* Detail OR list */}
                    {showDetail ? (
                        <ServiceDetail
                            service={selectedService}
                            locationsMap={locations.reduce((acc, l) => { acc[l.location_id] = l; return acc; }, {})}
                            onBack={handleBackFromDetail}
                        />
                    ) : (
                        <div className="results-list">
                            {dataLoading ? (
                                <div className="empty-state">
                                    <div className="loading-dots"><span /><span /><span /></div>
                                    <p>Diensten laden...</p>
                                </div>
                            ) : activeTab === 'locaties' ? (
                                filteredLocations.length === 0 ? (
                                    <div className="empty-state">
                                        <span className="empty-icon">📍</span>
                                        <p>Geen locaties gevonden.<br />Pas je filters aan.</p>
                                    </div>
                                ) : (
                                    filteredLocations.map((loc, i) => (
                                        <div
                                            key={loc.location_id}
                                            className="location-card"
                                            style={{ animationDelay: `${i * 0.03}s`, cursor: 'pointer' }}
                                            onClick={() => handleLocationCardClick(loc)}
                                        >
                                            <div className="loc-card-header">
                                                <div
                                                    className="loc-type-dot"
                                                    style={{ background: LOC_TYPE_COLORS[loc.location_type] || '#999' }}
                                                />
                                                <div className="loc-name">{loc.name}</div>
                                            </div>
                                            <div className="loc-address">{loc.address}</div>
                                            <div className="loc-services-count">
                                                {loc.services.length} dienst{loc.services.length !== 1 ? 'en' : ''}
                                                {' · '}
                                                <span style={{ color: LOC_TYPE_COLORS[loc.location_type] }}>
                          {LOC_TYPE_LABELS[loc.location_type] || loc.location_type}
                        </span>
                                            </div>
                                        </div>
                                    ))
                                )
                            ) : (
                                filteredServices.length === 0 ? (
                                    <div className="empty-state">
                                        <span className="empty-icon">🔎</span>
                                        <p>Geen diensten gevonden.<br />Probeer andere zoektermen.</p>
                                    </div>
                                ) : (() => {
                                    const recommended = filteredServices.filter((s) => highlightedIds.includes(s.service_id));
                                    const rest        = filteredServices.filter((s) => !highlightedIds.includes(s.service_id));
                                    const sorted      = [...recommended, ...rest];
                                    const showDivider = recommended.length > 0 && rest.length > 0;
                                    const showTopLabel = recommended.length > 0;

                                    return sorted.map((s, i) => {
                                        const catColor      = getCategoryColor(s._categories);
                                        const isHighlighted = highlightedIds.includes(s.service_id);
                                        const isFirstRest        = showDivider   && i === recommended.length;
                                        const isFirstHighlighted = showTopLabel  && i === 0;

                                        return (
                                            <React.Fragment key={s.service_id || i}>
                                                {isFirstHighlighted && (
                                                    <div
                                                        className="list-divider"
                                                        style={{ color: 'var(--accent)', borderColor: 'var(--accent-light)' }}
                                                    >
                                                        ⭐ Aanbevolen door Ray
                                                    </div>
                                                )}
                                                {isFirstRest && (
                                                    <div className="list-divider">Overige diensten</div>
                                                )}
                                                <div
                                                    className={`service-card ${isHighlighted ? 'highlighted' : ''}`}
                                                    style={{ animationDelay: `${i * 0.03}s`, cursor: 'pointer' }}
                                                    onClick={() => handleServiceClick(s)}
                                                >
                                                    <div className="card-header">
                                                        <div className="card-cat-dot" style={{ background: catColor }} />
                                                        <div className="card-name">{s.name}</div>
                                                        {s.type && <span className="card-type-badge">{s.type}</span>}
                                                    </div>
                                                    <div className="card-desc">{s.description}</div>
                                                    <div className="card-footer">
                                                        {s._access_type && (
                                                            <span className="card-access">
                                {ACCESS_ICONS[s._access_type] || '•'} {ACCESS_LABELS[s._access_type] || s._access_type}
                              </span>
                                                        )}
                                                        {s.cost_to_user && s.cost_to_user !== '###' && (
                                                            <span className="card-cost">{s.cost_to_user}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    });
                                })()
                            )}
                        </div>
                    )}
                </aside>

                {/* MAP */}
                <div className="map-container">
                    <MapContainer
                        center={[52.1601, 4.497]}
                        zoom={13}
                        style={{ width: '100%', height: '100%' }}
                        maxBounds={[[52.08, 4.34], [52.24, 4.66]]}
                        maxBoundsViscosity={0.85}
                        minZoom={11}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                        />
                        <MapController flyTo={flyTo} />
                        {locations
                            .filter((loc) => loc.latitude && loc.longitude)
                            .map((loc) => (
                                <Marker
                                    key={loc.location_id}
                                    position={[loc.latitude, loc.longitude]}
                                    icon={createLeafletIcon(loc.location_type)}
                                    ref={(ref) => {
                                        if (ref) markerRefs.current[loc.location_id] = ref;
                                    }}
                                >
                                    <Popup maxWidth={280}>
                                        <div className="popup-name">{loc.name}</div>
                                        <div
                                            className="popup-type"
                                            style={{ color: LOC_TYPE_COLORS[loc.location_type] }}
                                        >
                                            {LOC_TYPE_LABELS[loc.location_type] || loc.location_type}
                                        </div>
                                        <div className="popup-address">{loc.address}</div>
                                        {loc.services.length > 0 && (
                                            <div style={{ marginTop: 6 }}>
                                                {loc.services.slice(0, 6).map((s, i) => (
                                                    <div
                                                        key={i}
                                                        className="popup-service-item popup-service-clickable"
                                                        onClick={() => handleServiceClick(s, true)}
                                                    >
                                                        {s.name}
                                                        <span className="popup-service-arrow">→</span>
                                                    </div>
                                                ))}
                                                {loc.services.length > 6 && (
                                                    <div className="popup-service-item" style={{ color: '#9e9890', fontStyle: 'italic' }}>
                                                        +{loc.services.length - 6} meer diensten
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Popup>
                                </Marker>
                            ))}
                    </MapContainer>
                </div>
            </div>

            {/* GDPR footer */}
            <footer className="gdpr-footer">
                Ray slaat geen gegevens op. Alles verdwijnt zodra je dit venster sluit. | Gemeente Leiden Sociale Kaart
            </footer>

            {/* CHATBOT — rendered as an overlay modal (same as ai_feature) */}
            {showChat && (
                <Chatbot
                    services={services}
                    onClose={() => setShowChat(false)}
                    onHighlight={handleHighlight}
                />
            )}
        </div>
    );
}
