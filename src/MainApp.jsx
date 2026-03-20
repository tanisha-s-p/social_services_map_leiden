import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import IndexPage from "./IndexPage";
import App from "./App";        // customer app
import DBAdmin from "./manager/DBManager";

export default function MainApp() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<IndexPage />} />
                <Route path="/app" element={<App />} />
                <Route path="/admin" element={<DBAdmin />} />
            </Routes>
        </Router>
    );
}