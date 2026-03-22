import React from "react";
import { useNavigate } from "react-router-dom";

// ── Design tokens ────────────────────────────────────────────────────────────
const t = {
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
    fontDisplay:   "'DM Serif Display', Georgia, serif",
    fontBody:      "'DM Sans', system-ui, sans-serif",
};

const GOOGLE_FONTS =
    "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Serif+Display&display=swap";

// ── Sub-component ─────────────────────────────────────────────────────────────
function RoleCard({ icon, iconBg, title, description, cta, ctaColor, hoverBorder, onClick }) {
    const [hovered, setHovered] = React.useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: 224,
                background: t.surface,
                border: `1.5px solid ${hovered ? hoverBorder : t.border}`,
                borderRadius: t.radiusLg,
                padding: "26px 22px 22px",
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
                boxShadow: hovered ? t.shadowLg : t.shadowSm,
                transform: hovered ? "translateY(-3px)" : "translateY(0)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                fontFamily: t.fontBody,
            }}
        >
            <div style={{
                width: 42,
                height: 42,
                background: iconBg,
                borderRadius: t.radiusMd,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
            }}>{icon}</div>

            <div>
                <div style={{
                    fontFamily: t.fontDisplay,
                    fontSize: 18,
                    fontWeight: 400,
                    color: t.textPrimary,
                    marginBottom: 5,
                    lineHeight: 1.2,
                }}>{title}</div>
                <div style={{
                    fontSize: 13,
                    color: t.textSecondary,
                    lineHeight: 1.55,
                }}>{description}</div>
            </div>

            <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                fontWeight: 600,
                color: ctaColor,
                marginTop: 2,
            }}>
                {cta}
                <span style={{
                    display: "inline-block",
                    transition: "transform 0.15s",
                    transform: hovered ? "translateX(3px)" : "none",
                }}>→</span>
            </div>
        </button>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function IndexPage() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            background: t.bg,
            fontFamily: t.fontBody,
            color: t.textPrimary,
        }}>
            <link rel="stylesheet" href={GOOGLE_FONTS} />

            {/* ── HEADER ── */}
            <header style={{
                background: t.textPrimary,
                color: t.bg,
                padding: "16px 32px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                boxShadow: t.shadowMd,
            }}>
                <div style={{
                    width: 40,
                    height: 40,
                    background: "rgba(247,244,239,0.10)",
                    borderRadius: t.radiusSm,
                    border: "1px solid rgba(247,244,239,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                }}>🗺️</div>

                <div>
                    <div style={{
                        fontFamily: t.fontDisplay,
                        fontSize: 20,
                        fontWeight: 400,
                        lineHeight: 1.2,
                    }}>
                        Leiden Sociale Kaart
                    </div>
                    <div style={{
                        fontFamily: t.fontBody,
                        fontSize: 12,
                        color: t.textMuted,
                        marginTop: 2,
                    }}>
                        Gemeente Leiden · Hulp &amp; Ondersteuning
                    </div>
                </div>
            </header>

            {/* ── MAIN ── */}
            <main style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "56px 24px",
                gap: 44,
            }}>

                {/* Hero text */}
                <div style={{ textAlign: "center", maxWidth: 520 }}>
                    <h1 style={{
                        fontFamily: t.fontDisplay,
                        fontSize: 36,
                        fontWeight: 400,
                        color: t.textPrimary,
                        margin: "0 0 16px",
                        lineHeight: 1.2,
                    }}>
                        Welkom bij de Sociale Kaart
                    </h1>
                    <p style={{
                        fontSize: 16,
                        color: t.textSecondary,
                        lineHeight: 1.7,
                        margin: 0,
                    }}>
                        Vind hulp, diensten en ondersteuning voor inwoners van Leiden
                        met een laag inkomen — of beheer het aanbod als medewerker.
                    </p>
                </div>

                {/* Role cards */}
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
                    <RoleCard
                        icon="🧭"
                        iconBg={t.accentLight}
                        title="Inwoner"
                        description="Zoek diensten en hulp in jouw buurt"
                        cta="Ga naar de kaart"
                        ctaColor={t.accent}
                        hoverBorder={t.accent}
                        onClick={() => navigate("/app")}
                    />
                    <RoleCard
                        icon="⚙️"
                        iconBg={t.surface2}
                        title="Medewerker"
                        description="Beheer diensten en locaties in het systeem"
                        cta="Naar beheer"
                        ctaColor={t.textSecondary}
                        hoverBorder={t.textPrimary}
                        onClick={() => navigate("/admin")}
                    />
                </div>

                {/* Trust strip */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                    {[
                        { icon: "🔒", text: "Geen gegevens opgeslagen" },
                        { icon: "🆓", text: "Gratis te gebruiken" },
                        { icon: "📍", text: "Alleen voor Leiden" },
                    ].map(({ icon, text }, i, arr) => (
                        <React.Fragment key={text}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 13,
                                color: t.textMuted,
                                background: t.surface2,
                                border: `1px solid ${t.border}`,
                                borderRadius: t.radiusSm,
                                padding: "5px 10px",
                            }}>
                                <span>{icon}</span>
                                <span>{text}</span>
                            </div>
                            {i < arr.length - 1 && (
                                <span style={{ color: t.border, fontSize: 18, alignSelf: "center" }}>·</span>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </main>

            {/* ── FOOTER ── */}
            <footer style={{
                background: t.textPrimary,
                color: t.textMuted,
                fontFamily: t.fontBody,
                fontSize: 12,
                textAlign: "center",
                padding: "13px 24px",
                letterSpacing: 0.15,
            }}>
                Ray slaat geen gegevens op. Alles verdwijnt zodra je dit venster sluit.&nbsp;·&nbsp;Gemeente Leiden Sociale Kaart
            </footer>
        </div>
    );
}