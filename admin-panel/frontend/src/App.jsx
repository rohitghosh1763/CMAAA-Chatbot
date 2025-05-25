import React from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";
import Navbar from "./components/Navbar"; // Import Navbar
import Intents from "./components/Intents";
import Rules from "./components/Rules";
import Stories from "./components/Stories";
import Domain from "./components/Domain";
import UnknownQueries from "./components/UnknownQueries";
import "./App.css";

const App = () => {
    return (
        <Router>
            <Navbar /> {/* Add Navbar here */}
            <Routes>
                {/* Default route redirects to intents */}
                <Route path="/" element={<Navigate to="/intents" replace />} />
                {/* Main routes */}
                <Route path="/intents" element={<Intents />} />
                <Route path="/rules" element={<Rules />} />
                <Route path="/stories" element={<Stories />} />
                <Route path="/domain" element={<Domain />} />
                <Route path="/unknown" element={<UnknownQueries />} />
                {/* Fallback route */}
                <Route path="*" element={<Navigate to="/intents" replace />} />
            </Routes>
        </Router>
    );
};

export default App;
