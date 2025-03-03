import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Container from "./components/Container";
import Admin from "./components/Admin";
const App = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Container />} />
                <Route path="/admin" element={<Admin />} />
            </Routes>
        </Router>
    );
};

export default App;
