import React, { useState, useEffect } from "react";

import {
    Save,
    Plus,
    Trash2,
    Zap,
    AlertCircle,
    FileText,
    Code,
    Map,
    Database,
    Loader,
    Check,
    Settings,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

const RasaAdmin = () => {
    const navigate = useNavigate; // Placeholder for navigation
    const [activeTab, setActiveTab] = useState("intents");
    const [nluData, setNluData] = useState({ version: "3.1", nlu: [] });
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Navigate function (placeholder)
    const handleNavigate = (route) => {
        setActiveTab(route);
        // This would navigate to the route in a real implementation
        // navigate(`/${route}`);
    };

    useEffect(() => {
        if (activeTab === "intents") {
            fetchNluData();
        }
    }, [activeTab]);

    const fetchNluData = async () => {
        setLoading(true);
        try {
            const response = await fetch("http://localhost:8000/nlu");
            if (!response.ok)
                throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();
            const processedData = { ...data.content };

            if (processedData.nlu) {
                processedData.nlu = processedData.nlu.map((intent) => {
                    if (
                        intent.examples &&
                        typeof intent.examples === "string"
                    ) {
                        let cleanExamples = intent.examples.replace(
                            /\\n/g,
                            "\n"
                        );
                        cleanExamples = cleanExamples.replace(
                            /^["'](.*)["']$/s,
                            "$1"
                        );

                        const lines = cleanExamples.split("\n");
                        cleanExamples = lines
                            .map((line) =>
                                line.trim()
                                    ? line.startsWith("- ")
                                        ? line
                                        : `- ${line}`
                                    : line
                            )
                            .join("\n");

                        return { ...intent, examples: cleanExamples };
                    }
                    return intent;
                });
            }

            setNluData(processedData);
        } catch (err) {
            setToast({
                type: "error",
                message: `Failed to fetch NLU data: ${err.message}`,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleIntentChange = (index, field, value) => {
        const updatedNlu = [...nluData.nlu];
        updatedNlu[index] = { ...updatedNlu[index], [field]: value };
        setNluData({ ...nluData, nlu: updatedNlu });
    };

    const handleExamplesChange = (index, value) => {
        const updatedNlu = [...nluData.nlu];
        const lines = value.split("\n");
        const formattedValue = lines
            .map((line) =>
                line.trim()
                    ? line.startsWith("- ")
                        ? line
                        : `- ${line}`
                    : line
            )
            .join("\n");

        updatedNlu[index] = { ...updatedNlu[index], examples: formattedValue };
        setNluData({ ...nluData, nlu: updatedNlu });
    };

    const addIntent = () => {
        setNluData({
            ...nluData,
            nlu: [
                ...nluData.nlu,
                { intent: "new_intent", examples: "- example1\n- example2" },
            ],
        });
    };

    const removeIntent = (index) => {
        const updatedNlu = [...nluData.nlu];
        updatedNlu.splice(index, 1);
        setNluData({ ...nluData, nlu: updatedNlu });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const dataToSave = { ...nluData };

            if (dataToSave.nlu) {
                dataToSave.nlu = dataToSave.nlu.map((intent) => {
                    if (intent.examples) {
                        const lines = intent.examples.split("\n");
                        intent.examples = lines
                            .map((line) =>
                                line.trim()
                                    ? line.startsWith("- ")
                                        ? line
                                        : `- ${line}`
                                    : line
                            )
                            .join("\n");
                    }
                    return intent;
                });
            }

            const response = await fetch("http://localhost:8000/nlu", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: dataToSave }),
            });

            if (!response.ok)
                throw new Error(`HTTP error! Status: ${response.status}`);

            await response.json();
            setToast({
                type: "success",
                message: "Changes saved successfully!",
            });
        } catch (err) {
            setToast({
                type: "error",
                message: `Failed to save changes: ${err.message}`,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleTrain = async () => {
        setLoading(true);
        setToast({
            type: "success",
            message: "Training model... This may take a while.",
        });

        try {
            const response = await fetch("http://localhost:8000/train", {
                method: "POST",
            });

            if (!response.ok)
                throw new Error(`HTTP error! Status: ${response.status}`);

            await response.json();
            setToast({
                type: "success",
                message: "Model trained successfully!",
            });
        } finally {
            setLoading(false);
        }
    };

    const formatExamples = (examplesString) => {
        if (!examplesString) return [];
        return examplesString
            .split("\n")
            .filter((line) => line.trim().startsWith("-"))
            .map((line) => line.trim().substring(1).trim());
    };

    // Toast Notification Component
    const ToastNotification = () => {
        useEffect(() => {
            if (toast) {
                const timer = setTimeout(() => {
                    setToast(null);
                }, 3000);
                return () => clearTimeout(timer);
            }
        }, [toast]);

        if (!toast) return null;

        return (
            <Alert
                className={`fixed top-4 right-4 w-96 shadow-lg ${
                    toast.type === "success"
                        ? "border-green-500 bg-green-50"
                        : "border-red-500 bg-red-50"
                }`}
            >
                <div
                    className={`p-1 rounded-full ${
                        toast.type === "success"
                            ? "text-green-500"
                            : "text-red-500"
                    }`}
                >
                    {toast.type === "success" ? (
                        <Check size={18} />
                    ) : (
                        <AlertCircle size={18} />
                    )}
                </div>
                <AlertTitle
                    className={
                        toast.type === "success"
                            ? "text-green-800"
                            : "text-red-800"
                    }
                >
                    {toast.type === "success" ? "Success" : "Error"}
                </AlertTitle>
                <AlertDescription
                    className={
                        toast.type === "success"
                            ? "text-green-700"
                            : "text-red-700"
                    }
                >
                    {toast.message}
                </AlertDescription>
            </Alert>
        );
    };

    // Render different content based on active tab
    const renderContent = () => {
        switch (activeTab) {
            case "intents":
                return (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-800">
                                Intent Management
                            </h1>
                            <div className="flex space-x-3">
                                <button
                                    onClick={addIntent}
                                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                                >
                                    <Plus size={18} className="mr-2" />
                                    Add Intent
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400"
                                >
                                    <Save size={18} className="mr-2" />
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                    onClick={handleTrain}
                                    disabled={loading}
                                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-400"
                                >
                                    <Zap size={18} className="mr-2" />
                                    {loading ? "Training..." : "Train Model"}
                                </button>
                            </div>
                        </div>

                        {loading && !nluData.nlu?.length ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader
                                    size={32}
                                    className="text-indigo-600 animate-spin"
                                />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {nluData.nlu &&
                                    nluData.nlu.map((intent, index) => (
                                        <div
                                            key={index}
                                            className="bg-gray-50 rounded-lg p-5 shadow-sm border border-gray-200"
                                        >
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="w-1/3">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Intent Name
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={
                                                            intent.intent || ""
                                                        }
                                                        onChange={(e) =>
                                                            handleIntentChange(
                                                                index,
                                                                "intent",
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                        placeholder="Intent name"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        removeIntent(index)
                                                    }
                                                    className="flex items-center px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                                                >
                                                    <Trash2
                                                        size={16}
                                                        className="mr-1"
                                                    />
                                                    Remove
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Examples (one per line
                                                        with leading '-')
                                                    </label>
                                                    <textarea
                                                        value={
                                                            intent.examples ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            handleExamplesChange(
                                                                index,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full h-48 border border-gray-300 rounded-md px-3 py-2 font-mono text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                        placeholder="- example1&#10;- example2"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="bg-white rounded-md border border-gray-200 p-4 h-48 overflow-y-auto">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <h4 className="text-sm font-medium text-gray-700">
                                                                Example Preview
                                                            </h4>
                                                            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                                                                {
                                                                    formatExamples(
                                                                        intent.examples
                                                                    ).length
                                                                }{" "}
                                                                examples
                                                            </span>
                                                        </div>
                                                        <ul className="space-y-1">
                                                            {formatExamples(
                                                                intent.examples
                                                            ).map(
                                                                (
                                                                    example,
                                                                    i
                                                                ) => (
                                                                    <li
                                                                        key={i}
                                                                        className="text-gray-600 text-sm py-1 px-2 bg-gray-50 rounded"
                                                                    >
                                                                        "
                                                                        {
                                                                            example
                                                                        }
                                                                        "
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                );
            case "rules":
                return (
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-800 mb-6">
                            Rules Configuration
                        </h1>
                        <div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-300">
                            <Code
                                size={48}
                                className="mx-auto text-gray-400 mb-3"
                            />
                            <p className="text-gray-600">
                                Rules editor will be implemented here
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                Define conversation rules and response patterns
                            </p>
                            <button
                                onClick={() =>
                                    console.log(
                                        "Navigate to /rules implementation"
                                    )
                                }
                                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                Configure Rules
                            </button>
                        </div>
                    </div>
                );
            case "stories":
                return (
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-800 mb-6">
                            Stories Management
                        </h1>
                        <div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-300">
                            <Map
                                size={48}
                                className="mx-auto text-gray-400 mb-3"
                            />
                            <p className="text-gray-600">
                                Stories editor will be implemented here
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                Create and manage conversational flows
                            </p>
                            <button
                                onClick={() =>
                                    console.log(
                                        "Navigate to /stories implementation"
                                    )
                                }
                                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                Manage Stories
                            </button>
                        </div>
                    </div>
                );
            case "domain":
                return (
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-800 mb-6">
                            Domain Configuration
                        </h1>
                        <div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-300">
                            <Database
                                size={48}
                                className="mx-auto text-gray-400 mb-3"
                            />
                            <p className="text-gray-600">
                                Domain editor will be implemented here
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                Define responses, forms, and entities
                            </p>
                            <button
                                onClick={() =>
                                    console.log(
                                        "Navigate to /domain implementation"
                                    )
                                }
                                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                Configure Domain
                            </button>
                        </div>
                    </div>
                );
            case "unknown":
                return (
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-gray-800 mb-6">
                            Unknown Queries
                        </h1>
                        <div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-300">
                            <AlertCircle
                                size={48}
                                className="mx-auto text-gray-400 mb-3"
                            />
                            <p className="text-gray-600">
                                Unknown queries analysis will be implemented
                                here
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                Review and handle user inputs without matching
                                intents
                            </p>
                            <button
                                onClick={() =>
                                    console.log(
                                        "Navigate to /unknown implementation"
                                    )
                                }
                                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                Analyze Queries
                            </button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <div className="bg-indigo-700 shadow-lg">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between h-16 px-4">
                        <div className="flex items-center space-x-2">
                            <Settings className="text-indigo-200" size={24} />
                            <span className="text-white font-bold text-xl">
                                Rasa Studio
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button className="text-indigo-200 hover:text-white">
                                Documentation
                            </button>
                            <button className="text-indigo-200 hover:text-white">
                                Settings
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="container mx-auto px-4 py-6">
                {/* Tabs */}
                <div className="flex bg-white rounded-lg shadow mb-6 overflow-hidden">
                    <TabButton
                        active={activeTab === "intents"}
                        onClick={() => handleNavigate("intents")}
                        icon={<FileText size={18} />}
                        label="Intents"
                    />
                    <TabButton
                        active={activeTab === "rules"}
                        onClick={() => handleNavigate("rules")}
                        icon={<Code size={18} />}
                        label="Rules"
                    />
                    <TabButton
                        active={activeTab === "stories"}
                        onClick={() => handleNavigate("stories")}
                        icon={<Map size={18} />}
                        label="Stories"
                    />
                    <TabButton
                        active={activeTab === "domain"}
                        onClick={() => handleNavigate("domain")}
                        icon={<Database size={18} />}
                        label="Domain"
                    />
                    <TabButton
                        active={activeTab === "unknown"}
                        onClick={() => handleNavigate("unknown")}
                        icon={<AlertCircle size={18} />}
                        label="Unknown Queries"
                    />
                </div>

                {/* Content area */}
                <div className="bg-white shadow rounded-lg">
                    {renderContent()}
                </div>
            </div>

            {/* Toast notification */}
            <ToastNotification />
        </div>
    );
};

// Tab Button Component
const TabButton = ({ active, onClick, icon, label }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                active
                    ? "bg-indigo-600 text-white"
                    : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
            }`}
        >
            <span className="mr-2">{icon}</span>
            {label}
        </button>
    );
};

export default RasaAdmin;

// import React, { useState, useEffect } from "react";
// import axios from "axios";

// const IntentEditor = () => {
//     // All state management
//     const [nluData, setNluData] = useState({ version: "3.1", nlu: [] });
//     const [loading, setLoading] = useState(true);
//     const [message, setMessage] = useState(null);
//     const [error, setError] = useState(null);

//     // Data fetching
//     useEffect(() => {
//         fetchNluData();
//     }, []);

//     const fetchNluData = async () => {
//         setLoading(true);
//         try {
//             const response = await fetch("http://localhost:8000/nlu");
//             if (!response.ok) {
//                 throw new Error(`HTTP error! Status: ${response.status}`);
//             }
//             const data = await response.json();

//             // Process the data to ensure consistent format
//             const processedData = { ...data.content };
//             if (processedData.nlu) {
//                 processedData.nlu = processedData.nlu.map((intent) => {
//                     if (
//                         intent.examples &&
//                         typeof intent.examples === "string"
//                     ) {
//                         let cleanExamples = intent.examples.replace(
//                             /\\n/g,
//                             "\n"
//                         );
//                         cleanExamples = cleanExamples.replace(
//                             /^["'](.*)["']$/s,
//                             "$1"
//                         );

//                         const lines = cleanExamples.split("\n");
//                         cleanExamples = lines
//                             .map((line) =>
//                                 line.trim()
//                                     ? line.startsWith("- ")
//                                         ? line
//                                         : `- ${line}`
//                                     : line
//                             )
//                             .join("\n");

//                         return { ...intent, examples: cleanExamples };
//                     }
//                     return intent;
//                 });
//             }

//             setNluData(processedData);
//             setError(null);
//         } catch (err) {
//             setError(`Failed to fetch NLU data: ${err.message}`);
//             console.error("Error fetching NLU data:", err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Intent editing functions
//     const handleIntentChange = (index, field, value) => {
//         const updatedNlu = [...nluData.nlu];
//         updatedNlu[index] = { ...updatedNlu[index], [field]: value };
//         setNluData({ ...nluData, nlu: updatedNlu });
//     };

//     const handleExamplesChange = (index, value) => {
//         const updatedNlu = [...nluData.nlu];
//         const lines = value.split("\n");
//         const formattedValue = lines
//             .map((line) =>
//                 line.trim()
//                     ? line.startsWith("- ")
//                         ? line
//                         : `- ${line}`
//                     : line
//             )
//             .join("\n");

//         updatedNlu[index] = {
//             ...updatedNlu[index],
//             examples: formattedValue,
//         };
//         setNluData({ ...nluData, nlu: updatedNlu });
//     };

//     const addIntent = () => {
//         setNluData({
//             ...nluData,
//             nlu: [
//                 ...nluData.nlu,
//                 { intent: "new_intent", examples: "- example1\n- example2" },
//             ],
//         });
//     };

//     const removeIntent = (index) => {
//         const updatedNlu = [...nluData.nlu];
//         updatedNlu.splice(index, 1);
//         setNluData({ ...nluData, nlu: updatedNlu });
//     };

//     // API interaction functions
//     const handleSave = async () => {
//         setLoading(true);
//         try {
//             const dataToSave = { ...nluData };

//             // Format data before saving
//             if (dataToSave.nlu) {
//                 dataToSave.nlu = dataToSave.nlu.map((intent) => {
//                     if (intent.examples) {
//                         const lines = intent.examples.split("\n");
//                         intent.examples = lines
//                             .map((line) =>
//                                 line.trim()
//                                     ? line.startsWith("- ")
//                                         ? line
//                                         : `- ${line}`
//                                     : line
//                             )
//                             .join("\n");
//                     }
//                     return intent;
//                 });
//             }

//             const response = await fetch("http://localhost:8000/nlu", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                 },
//                 body: JSON.stringify({ content: dataToSave }),
//             });

//             if (!response.ok) {
//                 throw new Error(`HTTP error! Status: ${response.status}`);
//             }

//             await response.json();
//             setMessage("Changes saved successfully!");
//             setTimeout(() => setMessage(null), 3000);
//         } catch (err) {
//             setError(`Failed to save changes: ${err.message}`);
//             console.error("Save error:", err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleTrain = async () => {
//         setLoading(true);
//         setMessage("Training model... This may take a while.");
//         try {
//             const response = await fetch("http://localhost:8000/train", {
//                 method: "POST",
//             });

//             if (!response.ok) {
//                 throw new Error(`HTTP error! Status: ${response.status}`);
//             }

//             const result = await response.json();
//             setMessage("Model trained successfully!");
//             setTimeout(() => setMessage(null), 3000);
//         } catch (err) {
//             setError(`Failed to train model: ${err.message}`);
//             console.error("Training error:", err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     // Helper functions
//     const formatExamples = (examplesString) => {
//         if (!examplesString) return [];
//         return examplesString
//             .split("\n")
//             .filter((line) => line.trim().startsWith("-"))
//             .map((line) => line.trim().substring(1).trim());
//     };

//     // Render
//     return (
//         <div className="container mx-auto p-4">
//             <h1 className="text-2xl font-bold mb-4">Rasa NLU Admin Panel</h1>

//             {message && (
//                 <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
//                     {message}
//                 </div>
//             )}

//             {error && (
//                 <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//                     {error}
//                 </div>
//             )}

//             {loading && !nluData.nlu?.length ? (
//                 <div className="text-center p-4">Loading...</div>
//             ) : (
//                 <div className="p-4">
//                     <h2 className="text-xl font-bold mb-4">
//                         NLU Intent Editor
//                     </h2>

//                     {nluData.nlu &&
//                         nluData.nlu.map((intent, index) => (
//                             <div
//                                 key={index}
//                                 className="mb-6 p-4 border rounded"
//                             >
//                                 <div className="flex justify-between mb-2">
//                                     <input
//                                         type="text"
//                                         value={intent.intent || ""}
//                                         onChange={(e) =>
//                                             handleIntentChange(
//                                                 index,
//                                                 "intent",
//                                                 e.target.value
//                                             )
//                                         }
//                                         className="border p-2 w-1/3"
//                                         placeholder="Intent name"
//                                     />
//                                     <button
//                                         onClick={() => removeIntent(index)}
//                                         className="bg-red-500 text-white px-3 py-1 rounded"
//                                     >
//                                         Remove
//                                     </button>
//                                 </div>

//                                 <div className="mb-2">
//                                     <label className="block text-sm font-medium mb-1">
//                                         Examples (one per line, with leading
//                                         '-')
//                                     </label>
//                                     <textarea
//                                         value={intent.examples || ""}
//                                         onChange={(e) =>
//                                             handleExamplesChange(
//                                                 index,
//                                                 e.target.value
//                                             )
//                                         }
//                                         className="border p-2 w-full h-40 font-mono"
//                                         placeholder="- example1&#10;- example2"
//                                     />
//                                 </div>

//                                 <div className="bg-gray-100 rounded-lg p-3 mt-2">
//                                     <h4 className="text-sm font-medium text-gray-600 mb-2">
//                                         Example Preview (
//                                         {formatExamples(intent.examples).length}
//                                         )
//                                     </h4>
//                                     <ul className="space-y-1 max-h-32 overflow-y-auto">
//                                         {formatExamples(intent.examples).map(
//                                             (example, i) => (
//                                                 <li
//                                                     key={i}
//                                                     className="text-gray-700"
//                                                 >
//                                                     • {example}
//                                                 </li>
//                                             )
//                                         )}
//                                     </ul>
//                                 </div>
//                             </div>
//                         ))}

//                     <div className="flex space-x-4">
//                         <button
//                             onClick={addIntent}
//                             className="bg-blue-500 text-white px-4 py-2 rounded"
//                         >
//                             Add Intent
//                         </button>
//                         <button
//                             onClick={handleSave}
//                             disabled={loading}
//                             className="bg-green-500 text-white px-4 py-2 rounded"
//                         >
//                             {loading ? "Saving..." : "Save All Changes"}
//                         </button>
//                         <button
//                             onClick={handleTrain}
//                             disabled={loading}
//                             className="bg-purple-500 text-white px-4 py-2 rounded"
//                         >
//                             {loading ? "Training..." : "Train Model"}
//                         </button>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default IntentEditor;
