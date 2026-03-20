import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import MainApp from './MainApp';

const root = createRoot(document.getElementById('root'));
root.render(
    <Router>
        <MainApp />
    </Router>
);