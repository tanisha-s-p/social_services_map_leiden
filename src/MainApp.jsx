import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import App from "./App";        // customer app
import DBAdmin from "./DBAdmin";

export default function MainApp() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/app" element={<App />} />
                <Route path="/admin" element={<DBAdmin />} />
            </Routes>
        </Router>
    );
}