import React, { useState, useEffect } from "react";

const IntentEditor = ({ initialData, onSave }) => {
    const [nluData, setNluData] = useState(
        initialData || { version: "3.1", nlu: [] }
    );

    useEffect(() => {
        if (initialData) {
            // Process any incoming examples to ensure consistent format
            const processedData = { ...initialData };
            if (processedData.nlu) {
                processedData.nlu = processedData.nlu.map((intent) => {
                    if (intent.examples) {
                        // Handle string formatting if needed
                        if (typeof intent.examples === "string") {
                            // Clean up any escaped newlines
                            let cleanExamples = intent.examples.replace(
                                /\\n/g,
                                "\n"
                            );

                            // Remove surrounding quotes if present
                            cleanExamples = cleanExamples.replace(
                                /^["'](.*)["']$/s,
                                "$1"
                            );

                            // Ensure each line starts with "- "
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

                            intent.examples = cleanExamples;
                        }
                    }
                    return intent;
                });
            }
            setNluData(processedData);
        }
    }, [initialData]);

    const handleIntentChange = (index, field, value) => {
        const updatedNlu = [...nluData.nlu];
        updatedNlu[index] = { ...updatedNlu[index], [field]: value };
        setNluData({ ...nluData, nlu: updatedNlu });
    };

    const handleExamplesChange = (index, value) => {
        // Handle examples as a multiline string
        const updatedNlu = [...nluData.nlu];

        // Ensure each line starts with "- "
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

    const handleSave = () => {
        // Create a clean copy for saving
        const dataToSave = { ...nluData };

        // Make sure all examples have the correct format before sending to backend
        if (dataToSave.nlu) {
            dataToSave.nlu = dataToSave.nlu.map((intent) => {
                const cleanIntent = { ...intent };

                // Ensure examples have the proper format
                if (cleanIntent.examples) {
                    // Make sure each line starts with "- "
                    const lines = cleanIntent.examples.split("\n");
                    cleanIntent.examples = lines
                        .map((line) =>
                            line.trim()
                                ? line.startsWith("- ")
                                    ? line
                                    : `- ${line}`
                                : line
                        )
                        .join("\n");
                }

                return cleanIntent;
            });
        }

        onSave(dataToSave);
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">NLU Intent Editor</h2>

            {nluData.nlu &&
                nluData.nlu.map((intent, index) => (
                    <div key={index} className="mb-6 p-4 border rounded">
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
                                Examples (one per line, with leading '-')
                            </label>
                            <textarea
                                value={intent.examples || ""}
                                onChange={(e) =>
                                    handleExamplesChange(index, e.target.value)
                                }
                                className="border p-2 w-full h-40 font-mono"
                                placeholder="- example1&#10;- example2"
                            />
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
                    className="bg-green-500 text-white px-4 py-2 rounded"
                >
                    Save All Changes
                </button>
            </div>
        </div>
    );
};

export default IntentEditor;
