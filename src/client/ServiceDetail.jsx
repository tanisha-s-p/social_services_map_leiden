import React from 'react';
import { CATEGORY_COLORS, ACCESS_LABELS, LOC_TYPE_COLORS, LOC_TYPE_LABELS, getCategoryColor } from '../utils';

const ACCESS_ICONS = {
    walkin: '🚶',
    appointment: '📅',
    home_visit: '🏠',
    online: '💻',
    phone: '📞',
    referral_only: '📋',
};

export default function ServiceDetail({ service, locationsMap = {}, onBack }) {
    if (!service) return null;

    const catColor = getCategoryColor(service._categories);
    const cats = service._categories || [];
    const accessType = service._access_type;

    // Resolve all locations for this service
    const allLocs = (service._loc_ids || [])
        .map((id) => locationsMap[id])
        .filter(Boolean);

    return (
        <div className="detail-panel">
            {/* Back button */}
            <button className="detail-back-btn" onClick={onBack}>
                ← Terug
            </button>

            {/* Category strip */}
            <div className="detail-cat-strip">
                {cats.map((cat) => (
                    <span
                        key={cat}
                        className="detail-cat-badge"
                        style={{ background: CATEGORY_COLORS[cat] || catColor }}
                    >
            {cat}
          </span>
                ))}
                {service.type && (
                    <span className="detail-type-badge">{service.type}</span>
                )}
            </div>

            {/* Name */}
            <h2 className="detail-name">{service.name}</h2>

            {/* Description */}
            <p className="detail-desc">{service.description}</p>

            {/* Info rows */}
            <div className="detail-info-grid">

                {service.target_group && (
                    <div className="detail-info-row">
                        <span className="detail-info-icon">👥</span>
                        <div>
                            <div className="detail-info-label">Voor wie</div>
                            <div className="detail-info-value">{service.target_group}</div>
                        </div>
                    </div>
                )}

                {service.cost_to_user && service.cost_to_user !== '###' && (
                    <div className="detail-info-row">
                        <span className="detail-info-icon">💶</span>
                        <div>
                            <div className="detail-info-label">Kosten</div>
                            <div className="detail-info-value">{service.cost_to_user}</div>
                        </div>
                    </div>
                )}

                {accessType && (
                    <div className="detail-info-row">
                        <span className="detail-info-icon">{ACCESS_ICONS[accessType] || '📋'}</span>
                        <div>
                            <div className="detail-info-label">Hoe aanvragen</div>
                            <div className="detail-info-value">{ACCESS_LABELS[accessType] || accessType}</div>
                        </div>
                    </div>
                )}

                {service.availability && (
                    <div className="detail-info-row">
                        <span className="detail-info-icon">🕐</span>
                        <div>
                            <div className="detail-info-label">Openingstijden</div>
                            <div className="detail-info-value">{service.availability}</div>
                        </div>
                    </div>
                )}

                {service.needs_referral && service.needs_referral.toLowerCase() === 'yes' && (
                    <div className="detail-info-row">
                        <span className="detail-info-icon">📋</span>
                        <div>
                            <div className="detail-info-label">Verwijzing nodig</div>
                            <div className="detail-info-value">Ja, aanmelding via hulpverlener</div>
                        </div>
                    </div>
                )}

                {service.income_requirement && (
                    <div className="detail-info-row">
                        <span className="detail-info-icon">📊</span>
                        <div>
                            <div className="detail-info-label">Inkomenseis</div>
                            <div className="detail-info-value">{service.income_requirement}</div>
                        </div>
                    </div>
                )}

                {allLocs.length > 0 && (
                    <div className="detail-info-row">
                        <span className="detail-info-icon">📍</span>
                        <div style={{ flex: 1 }}>
                            <div className="detail-info-label">
                                {allLocs.length === 1 ? 'Locatie' : `Locaties (${allLocs.length})`}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                                {allLocs.map((l) => (
                                    <div key={l.location_id}>
                    <span
                        className="detail-loc-name"
                        style={{ color: LOC_TYPE_COLORS[l.location_type] }}
                    >
                      {l.name}
                    </span>
                                        <br />
                                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {l.address}{l.postcode ? `, ${l.postcode}` : ''}
                    </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Notes */}
            {service.notes && service.notes.trim() && (
                <div className="detail-notes">
                    <div className="detail-notes-label">ℹ️ Extra informatie</div>
                    <div className="detail-notes-text">{service.notes}</div>
                </div>
            )}

            {/* Contact */}
            <div className="detail-contact">
                {service.phone && (
                    <a href={`tel:${service.phone}`} className="detail-contact-btn">
                        📞 {service.phone}
                    </a>
                )}
                {service.email && (
                    <a href={`mailto:${service.email}`} className="detail-contact-btn">
                        ✉️ E-mail
                    </a>
                )}
                {service.website && service.website.startsWith('http') && (
                    <a
                        href={service.website}
                        target="_blank"
                        rel="noreferrer"
                        className="detail-contact-btn detail-contact-btn--primary"
                    >
                        🔗 Naar website
                    </a>
                )}
            </div>

            {/* Last verified */}
            {service.last_verified && (
                <div className="detail-verified">
                    Laatst gecontroleerd: {service.last_verified}
                </div>
            )}
        </div>
    );
}