import React, { useState, useEffect } from "react";
import axios from "axios";

const IntentEditor = () => {
    // All state management
    const [nluData, setNluData] = useState({ version: "3.1", nlu: [] });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    // Data fetching
    useEffect(() => {
        fetchNluData();
    }, []);

    const fetchNluData = async () => {
        setLoading(true);
        try {
            const response = await fetch("http://localhost:8000/nlu");
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();

            // Process the data to ensure consistent format
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
            setError(null);
        } catch (err) {
            setError(`Failed to fetch NLU data: ${err.message}`);
            console.error("Error fetching NLU data:", err);
        } finally {
            setLoading(false);
        }
    };

    // Intent editing functions
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

        updatedNlu[index] = {
            ...updatedNlu[index],
            examples: formattedValue,
        };
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

    // API interaction functions
    const handleSave = async () => {
        setLoading(true);
        try {
            const dataToSave = { ...nluData };

            // Format data before saving
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
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ content: dataToSave }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            await response.json();
            setMessage("Changes saved successfully!");
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setError(`Failed to save changes: ${err.message}`);
            console.error("Save error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleTrain = async () => {
        setLoading(true);
        setMessage("Training model... This may take a while.");
        try {
            const response = await fetch("http://localhost:8000/train", {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const result = await response.json();
            setMessage("Model trained successfully!");
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setError(`Failed to train model: ${err.message}`);
            console.error("Training error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Helper functions
    const formatExamples = (examplesString) => {
        if (!examplesString) return [];
        return examplesString
            .split("\n")
            .filter((line) => line.trim().startsWith("-"))
            .map((line) => line.trim().substring(1).trim());
    };

    // Render
    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Rasa NLU Admin Panel</h1>

            {message && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    {message}
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {loading && !nluData.nlu?.length ? (
                <div className="text-center p-4">Loading...</div>
            ) : (
                <div className="p-4">
                    <h2 className="text-xl font-bold mb-4">
                        NLU Intent Editor
                    </h2>

                    {nluData.nlu &&
                        nluData.nlu.map((intent, index) => (
                            <div
                                key={index}
                                className="mb-6 p-4 border rounded"
                            >
                                <div className="flex justify-between mb-2">
                                    <input
                                        type="text"
                                        value={intent.intent || ""}
                                        onChange={(e) =>
                                            handleIntentChange(
                                                index,
                                                "intent",
                                                e.target.value
                                            )
                                        }
                                        className="border p-2 w-1/3"
                                        placeholder="Intent name"
                                    />
                                    <button
                                        onClick={() => removeIntent(index)}
                                        className="bg-red-500 text-white px-3 py-1 rounded"
                                    >
                                        Remove
                                    </button>
                                </div>

                                <div className="mb-2">
                                    <label className="block text-sm font-medium mb-1">
                                        Examples (one per line, with leading
                                        '-')
                                    </label>
                                    <textarea
                                        value={intent.examples || ""}
                                        onChange={(e) =>
                                            handleExamplesChange(
                                                index,
                                                e.target.value
                                            )
                                        }
                                        className="border p-2 w-full h-40 font-mono"
                                        placeholder="- example1&#10;- example2"
                                    />
                                </div>

                                <div className="bg-gray-100 rounded-lg p-3 mt-2">
                                    <h4 className="text-sm font-medium text-gray-600 mb-2">
                                        Example Preview (
                                        {formatExamples(intent.examples).length}
                                        )
                                    </h4>
                                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                                        {formatExamples(intent.examples).map(
                                            (example, i) => (
                                                <li
                                                    key={i}
                                                    className="text-gray-700"
                                                >
                                                    • {example}
                                                </li>
                                            )
                                        )}
                                    </ul>
                                </div>
                            </div>
                        ))}

                    <div className="flex space-x-4">
                        <button
                            onClick={addIntent}
                            className="bg-blue-500 text-white px-4 py-2 rounded"
                        >
                            Add Intent
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="bg-green-500 text-white px-4 py-2 rounded"
                        >
                            {loading ? "Saving..." : "Save All Changes"}
                        </button>
                        <button
                            onClick={handleTrain}
                            disabled={loading}
                            className="bg-purple-500 text-white px-4 py-2 rounded"
                        >
                            {loading ? "Training..." : "Train Model"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IntentEditor;

// import React, { useState, useEffect } from "react";

// const IntentEditor = ({ initialData, onSave }) => {
//     const [nluData, setNluData] = useState(
//         initialData || { version: "3.1", nlu: [] }
//     );

//     useEffect(() => {
//         if (initialData) {
//             // Process any incoming examples to ensure consistent format
//             const processedData = { ...initialData };
//             if (processedData.nlu) {
//                 processedData.nlu = processedData.nlu.map((intent) => {
//                     if (intent.examples) {
//                         // Handle string formatting if needed
//                         if (typeof intent.examples === "string") {
//                             // Clean up any escaped newlines
//                             let cleanExamples = intent.examples.replace(
//                                 /\\n/g,
//                                 "\n"
//                             );

//                             // Remove surrounding quotes if present
//                             cleanExamples = cleanExamples.replace(
//                                 /^["'](.*)["']$/s,
//                                 "$1"
//                             );

//                             // Ensure each line starts with "- "
//                             const lines = cleanExamples.split("\n");
//                             cleanExamples = lines
//                                 .map((line) =>
//                                     line.trim()
//                                         ? line.startsWith("- ")
//                                             ? line
//                                             : `- ${line}`
//                                         : line
//                                 )
//                                 .join("\n");

//                             intent.examples = cleanExamples;
//                         }
//                     }
//                     return intent;
//                 });
//             }
//             setNluData(processedData);
//         }
//     }, [initialData]);

//     const handleIntentChange = (index, field, value) => {
//         const updatedNlu = [...nluData.nlu];
//         updatedNlu[index] = { ...updatedNlu[index], [field]: value };
//         setNluData({ ...nluData, nlu: updatedNlu });
//     };

//     const handleExamplesChange = (index, value) => {
//         // Handle examples as a multiline string
//         const updatedNlu = [...nluData.nlu];

//         // Ensure each line starts with "- "
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

//     const handleSave = () => {
//         // Create a clean copy for saving
//         const dataToSave = { ...nluData };

//         // Make sure all examples have the correct format before sending to backend
//         if (dataToSave.nlu) {
//             dataToSave.nlu = dataToSave.nlu.map((intent) => {
//                 const cleanIntent = { ...intent };

//                 // Ensure examples have the proper format
//                 if (cleanIntent.examples) {
//                     // Make sure each line starts with "- "
//                     const lines = cleanIntent.examples.split("\n");
//                     cleanIntent.examples = lines
//                         .map((line) =>
//                             line.trim()
//                                 ? line.startsWith("- ")
//                                     ? line
//                                     : `- ${line}`
//                                 : line
//                         )
//                         .join("\n");
//                 }

//                 return cleanIntent;
//             });
//         }

//         onSave(dataToSave);
//     };

//     return (
//         <div className="p-4">
//             <h2 className="text-xl font-bold mb-4">NLU Intent Editor</h2>

//             {nluData.nlu &&
//                 nluData.nlu.map((intent, index) => (
//                     <div key={index} className="mb-6 p-4 border rounded">
//                         <div className="flex justify-between mb-2">
//                             <input
//                                 type="text"
//                                 value={intent.intent || ""}
//                                 onChange={(e) =>
//                                     handleIntentChange(
//                                         index,
//                                         "intent",
//                                         e.target.value
//                                     )
//                                 }
//                                 className="border p-2 w-1/3"
//                                 placeholder="Intent name"
//                             />
//                             <button
//                                 onClick={() => removeIntent(index)}
//                                 className="bg-red-500 text-white px-3 py-1 rounded"
//                             >
//                                 Remove
//                             </button>
//                         </div>

//                         <div className="mb-2">
//                             <label className="block text-sm font-medium mb-1">
//                                 Examples (one per line, with leading '-')
//                             </label>
//                             <textarea
//                                 value={intent.examples || ""}
//                                 onChange={(e) =>
//                                     handleExamplesChange(index, e.target.value)
//                                 }
//                                 className="border p-2 w-full h-40 font-mono"
//                                 placeholder="- example1&#10;- example2"
//                             />
//                         </div>
//                     </div>
//                 ))}

//             <div className="flex space-x-4">
//                 <button
//                     onClick={addIntent}
//                     className="bg-blue-500 text-white px-4 py-2 rounded"
//                 >
//                     Add Intent
//                 </button>
//                 <button
//                     onClick={handleSave}
//                     className="bg-green-500 text-white px-4 py-2 rounded"
//                 >
//                     Save All Changes
//                 </button>
//             </div>
//         </div>
//     );
// };

// export default IntentEditor;
