import React from 'react';
import ReactDOM from 'react-dom/client';
import MainApp from "./MainApp";

import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';

const root = createRoot(document.getElementById('root'));
root.render(
    <Router>
        <MainApp />
    </Router>
);


