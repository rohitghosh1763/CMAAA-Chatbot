import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Admin = () => {
    const navigate = useNavigate();
    const [intents, setIntents] = useState([]);
    const [currentIntent, setCurrentIntent] = useState({
        intent_name: "",
        examples: [],
    });
    const [example, setExample] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch all intents when component mounts
    useEffect(() => {
        fetchIntents();
    }, []);

    const fetchIntents = async () => {
        setLoading(true);
        try {
            const response = await axios.get("http://localhost:5000/intents");
            setIntents(response.data);
        } catch (error) {
            console.error("Error fetching intents:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentIntent.intent_name.trim()) return;

        setLoading(true);
        try {
            if (editMode) {
                await axios.put(
                    `http://localhost:5000/intents/${currentIntent._id}`,
                    currentIntent
                );
            } else {
                await axios.post(
                    "http://localhost:5000/intents",
                    currentIntent
                );
            }
            fetchIntents();
            setCurrentIntent({ intent_name: "", examples: [] });
            setEditMode(false);
        } catch (error) {
            console.error("Error saving intent:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteIntent = async (id) => {
        if (!window.confirm("Are you sure you want to delete this intent?"))
            return;

        setLoading(true);
        try {
            await axios.delete(`http://localhost:5000/intents/${id}`);
            fetchIntents();
        } catch (error) {
            console.error("Error deleting intent:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditIntent = (intent) => {
        setCurrentIntent(intent);
        setEditMode(true);
    };

    const handleAddExample = () => {
        if (!example.trim()) return;
        setCurrentIntent({
            ...currentIntent,
            examples: [...currentIntent.examples, example],
        });
        setExample("");
    };

    const handleRemoveExample = (index) => {
        const newExamples = [...currentIntent.examples];
        newExamples.splice(index, 1);
        setCurrentIntent({
            ...currentIntent,
            examples: newExamples,
        });
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#fefae0] p-4">
            <div className="container mx-auto max-w-4xl">
                <nav className="flex justify-between mb-6">
                    <h1 className="text-3xl font-bold">Intent Management</h1>
                    <button
                        onClick={() => navigate("/")}
                        className="bg-[#606c38] text-white px-4 py-2 rounded hover:bg-[#283618]"
                    >
                        Back to Chat
                    </button>
                </nav>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Intent Form */}
                    <div className="bg-[#f5ebe0] p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">
                            {editMode ? "Edit Intent" : "Add New Intent"}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block mb-2">
                                    Intent Name
                                </label>
                                <input
                                    type="text"
                                    value={currentIntent.intent_name}
                                    onChange={(e) =>
                                        setCurrentIntent({
                                            ...currentIntent,
                                            intent_name: e.target.value,
                                        })
                                    }
                                    className="w-full p-2 border rounded"
                                    placeholder="e.g., greet, goodbye, thank_you"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block mb-2">Examples</label>
                                <div className="flex mb-2">
                                    <input
                                        type="text"
                                        value={example}
                                        onChange={(e) =>
                                            setExample(e.target.value)
                                        }
                                        className="flex-1 p-2 border rounded-l"
                                        placeholder="Add an example phrase"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddExample}
                                        className="bg-[#dda15e] px-4 py-2 rounded-r"
                                    >
                                        Add
                                    </button>
                                </div>

                                <div className="bg-white p-3 rounded max-h-40 overflow-y-auto">
                                    {currentIntent.examples.length === 0 ? (
                                        <p className="text-gray-500">
                                            No examples added yet
                                        </p>
                                    ) : (
                                        <ul className="list-disc pl-5">
                                            {currentIntent.examples.map(
                                                (ex, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex justify-between items-center mb-1"
                                                    >
                                                        <span>{ex}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleRemoveExample(
                                                                    index
                                                                )
                                                            }
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            ×
                                                        </button>
                                                    </li>
                                                )
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <button
                                    type="submit"
                                    className="bg-[#606c38] text-white px-4 py-2 rounded hover:bg-[#283618]"
                                    disabled={loading}
                                >
                                    {loading
                                        ? "Saving..."
                                        : editMode
                                        ? "Update Intent"
                                        : "Create Intent"}
                                </button>
                                {editMode && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCurrentIntent({
                                                intent_name: "",
                                                examples: [],
                                            });
                                            setEditMode(false);
                                        }}
                                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Intent List */}
                    <div className="bg-[#f5ebe0] p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">
                            Existing Intents
                        </h2>
                        {loading && <p>Loading...</p>}

                        {intents.length === 0 && !loading ? (
                            <p className="text-gray-500">
                                No intents found. Create your first one!
                            </p>
                        ) : (
                            <div className="overflow-y-auto max-h-96">
                                {intents.map((intent) => (
                                    <div
                                        key={intent._id}
                                        className="mb-3 p-3 bg-white rounded shadow-sm"
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-bold">
                                                {intent.intent_name}
                                            </h3>
                                            <div>
                                                <button
                                                    onClick={() =>
                                                        handleEditIntent(intent)
                                                    }
                                                    className="text-blue-600 hover:text-blue-800 mr-2"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDeleteIntent(
                                                            intent._id
                                                        )
                                                    }
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-1">
                                            {intent.examples.length} example
                                            {intent.examples.length !== 1
                                                ? "s"
                                                : ""}
                                        </p>
                                        {intent.examples.length > 0 && (
                                            <div className="text-sm text-gray-700 italic">
                                                "{intent.examples[0]}"
                                                {intent.examples.length > 1 &&
                                                    " and more..."}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Admin;
