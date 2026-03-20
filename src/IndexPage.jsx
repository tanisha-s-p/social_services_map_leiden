import { useNavigate } from "react-router-dom";

export default function IndexPage() {
    const navigate = useNavigate();

    return (
        <div style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5f5f5"
        }}>
            <div style={{
                background: "white",
                padding: 40,
                borderRadius: 12,
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                textAlign: "center"
            }}>
                <h1 style={{ marginBottom: 30 }}>Welcome</h1>

                <div style={{ display: "flex", gap: 20 }}>
                    <button
                        onClick={() => navigate("/admin")}
                        style={{
                            padding: "12px 24px",
                            borderRadius: 8,
                            border: "none",
                            background: "#1E293B",
                            color: "white",
                            cursor: "pointer"
                        }}
                    >
                        Manager
                    </button>

                    <button
                        onClick={() => navigate("/app")}
                        style={{
                            padding: "12px 24px",
                            borderRadius: 8,
                            border: "none",
                            background: "#2563EB",
                            color: "white",
                            cursor: "pointer"
                        }}
                    >
                        Customer
                    </button>
                </div>
            </div>
        </div>
    );
}