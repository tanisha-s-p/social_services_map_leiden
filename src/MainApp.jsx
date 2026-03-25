import { HashRouter, Routes, Route } from "react-router-dom";
import IndexPage from "./IndexPage";
import CustomerApp from "./CustomerApp";
import DBManager from "./DBManager";

export default function MainApp() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<IndexPage />} />
                <Route path="/app" element={<CustomerApp />} />
                <Route path="/admin" element={<DBManager />} />
            </Routes>
        </HashRouter>
    );
}