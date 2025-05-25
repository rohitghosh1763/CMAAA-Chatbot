import React from "react";
import { Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileText, Code, Map, Database, AlertCircle } from "lucide-react";

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const activeTab = location.pathname.replace("/", "") || "intents";

    const handleNavigate = (route) => {
        navigate(`/${route}`);
    };

    return (
        <>
            <div className="bg-indigo-700 shadow-lg sticky top-0 z-40">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between h-16 px-4">
                        <div className="flex items-center space-x-2">
                            <Settings className="text-indigo-200" size={24} />
                            <span className="text-white font-bold text-xl cursor-pointer" onClick={() => handleNavigate("intents")}>
                                CMAAA Chatbot Admin Panel
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-6">
                <div className="flex bg-white rounded-lg shadow-md mb-6 overflow-x-auto">
                    <TabButton active={activeTab === "intents"} onClick={() => handleNavigate("intents")} icon={<FileText size={18} />} label="Intents" />
                    <TabButton active={activeTab === "rules"} onClick={() => handleNavigate("rules")} icon={<Code size={18} />} label="Rules" />
                    <TabButton active={activeTab === "stories"} onClick={() => handleNavigate("stories")} icon={<Map size={18} />} label="Stories" />
                    <TabButton active={activeTab === "domain"} onClick={() => handleNavigate("domain")} icon={<Database size={18} />} label="Domain" />
                    <TabButton active={activeTab === "unknown"} onClick={() => handleNavigate("unknown")} icon={<AlertCircle size={18} />} label="Unknown Queries" />
                    <TabButton active={activeTab === "Models"} onClick={() => handleNavigate("models")} icon={<AlertCircle size={18} />} label="Models" />
                </div>
            </div>
        </>
    );
};

const TabButton = ({ active, onClick, icon, label }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 ease-in-out relative group whitespace-nowrap
                        ${active ? "text-indigo-600" : "text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"}`}
        >
            <span className="mr-2">{icon}</span>
            {label}
            <span className={`absolute bottom-0 left-0 h-0.5 bg-indigo-600 transition-all duration-300 ease-out
                            ${active ? "w-full" : "w-0 group-hover:w-full"}`} />
        </button>
    );
};

export default Navbar;