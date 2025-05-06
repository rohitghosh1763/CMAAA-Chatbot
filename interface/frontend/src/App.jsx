import React from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import Intents from "./components/Intents";
import Rules from "./components/Rules";
import Stories from "./components/Stories";
import "./App.css";

const App = () => {
    return (
        <Router>
            <Routes>
                {/* Default route redirects to intents */}
                <Route path="/" element={<Navigate to="/intents" replace />} />

                {/* Main routes */}
                <Route path="/intents" element={<Intents />} />
                <Route path="/rules" element={<Rules />} />
                <Route path="/stories" element={<Stories />} />
                <Route path="/domain" element={<Intents />} />
                <Route path="/unknown" element={<Intents />} />

                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/intents" replace />} />
            </Routes>
        </Router>
    );
};

export default App;

