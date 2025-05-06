import React, { useState, useEffect } from "react";
import {
    Save,
    Plus,
    Trash2,
    Zap,
    AlertCircle,
    Check,
    ArrowDown,
    ArrowUp,
    PlusCircle,
    MinusCircle,
    Settings,
    FileText,
    Code,
    Map,
    Database,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate, useLocation } from "react-router-dom";

const Stories = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState("stories");
    const [storiesData, setStoriesData] = useState({
        version: "3.1",
        stories: [],
    });
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    // Set active tab based on current path when component mounts
    useEffect(() => {
        const path = location.pathname.replace("/", "") || "stories";
        setActiveTab(path);
    }, [location]);

    // Navigate function
    const handleNavigate = (route) => {
        setActiveTab(route);
        navigate(`/${route}`);
    };

    useEffect(() => {
        if (activeTab === "stories") {
            fetchStoriesData();
        }
    }, [activeTab]);

    const fetchStoriesData = async () => {
        setLoading(true);
        try {
            const response = await fetch("http://localhost:8000/stories");
            if (!response.ok)
                throw new Error(`HTTP error! Status: ${response.status}`);

            const data = await response.json();
            setStoriesData(data.content);
        } catch (err) {
            setToast({
                type: "error",
                message: `Failed to fetch stories data: ${err.message}`,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleStoryChange = (index, field, value) => {
        const updatedStories = [...storiesData.stories];
        updatedStories[index] = { ...updatedStories[index], [field]: value };
        setStoriesData({ ...storiesData, stories: updatedStories });
    };

    const addStory = () => {
        setStoriesData({
            ...storiesData,
            stories: [
                {
                    story: "New story",
                    steps: [
                        { intent: "example_intent" },
                        { action: "example_action" },
                    ],
                },
                ...storiesData.stories,
            ],
        });
    };

    const removeStory = (index) => {
        const updatedStories = [...storiesData.stories];
        updatedStories.splice(index, 1);
        setStoriesData({ ...storiesData, stories: updatedStories });
    };

    const addStep = (storyIndex) => {
        const updatedStories = [...storiesData.stories];
        const currentSteps = updatedStories[storyIndex].steps || [];

        // Default to adding an intent step
        updatedStories[storyIndex].steps = [
            ...currentSteps,
            { intent: "example_intent" },
        ];

        setStoriesData({ ...storiesData, stories: updatedStories });
    };

    const removeStep = (storyIndex, stepIndex) => {
        const updatedStories = [...storiesData.stories];
        updatedStories[storyIndex].steps.splice(stepIndex, 1);
        setStoriesData({ ...storiesData, stories: updatedStories });
    };

    const moveStep = (storyIndex, stepIndex, direction) => {
        if (direction !== "up" && direction !== "down") return;

        const updatedStories = [...storiesData.stories];
        const steps = updatedStories[storyIndex].steps;

        if (direction === "up" && stepIndex > 0) {
            // Move step up
            [steps[stepIndex], steps[stepIndex - 1]] = [
                steps[stepIndex - 1],
                steps[stepIndex],
            ];
        } else if (direction === "down" && stepIndex < steps.length - 1) {
            // Move step down
            [steps[stepIndex], steps[stepIndex + 1]] = [
                steps[stepIndex + 1],
                steps[stepIndex],
            ];
        }

        setStoriesData({ ...storiesData, stories: updatedStories });
    };

    const handleStepChange = (storyIndex, stepIndex, key, value) => {
        const updatedStories = [...storiesData.stories];

        // If the step exists, update it
        if (updatedStories[storyIndex].steps[stepIndex]) {
            // Create a new step with only the new key-value pair
            updatedStories[storyIndex].steps[stepIndex] = { [key]: value };
        }

        setStoriesData({ ...storiesData, stories: updatedStories });
    };

    const handleStepTypeChange = (storyIndex, stepIndex, newType) => {
        const updatedStories = [...storiesData.stories];
        const currentStep = updatedStories[storyIndex].steps[stepIndex];
        const currentValue = Object.values(currentStep)[0] || "";

        // Replace the step with a new one of the selected type
        updatedStories[storyIndex].steps[stepIndex] = {
            [newType]: currentValue,
        };

        setStoriesData({ ...storiesData, stories: updatedStories });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch("http://localhost:8000/stories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: storiesData }),
            });

            if (!response.ok)
                throw new Error(`HTTP error! Status: ${response.status}`);

            await response.json();
            setToast({
                type: "success",
                message: "Stories saved successfully!",
            });
        } catch (err) {
            setToast({
                type: "error",
                message: `Failed to save stories: ${err.message}`,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleTrain = async () => {
        setLoading(true);
        setToast({
            type: "info",
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
        } catch (err) {
            setToast({
                type: "error",
                message: `Training failed: ${err.message}`,
            });
        } finally {
            setLoading(false);
        }
    };

    // Toast Notification Component - reused from Rules
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

        let bgColor = "bg-blue-50";
        let borderColor = "border-blue-500";
        let textColor = "text-blue-700";
        let titleColor = "text-blue-800";
        let iconColor = "text-blue-500";
        let Icon = AlertCircle;

        if (toast.type === "success") {
            bgColor = "bg-green-50";
            borderColor = "border-green-500";
            textColor = "text-green-700";
            titleColor = "text-green-800";
            iconColor = "text-green-500";
            Icon = Check;
        } else if (toast.type === "error") {
            bgColor = "bg-red-50";
            borderColor = "border-red-500";
            textColor = "text-red-700";
            titleColor = "text-red-800";
            iconColor = "text-red-500";
        }

        return (
            <Alert
                className={`fixed top-4 right-4 w-96 shadow-lg ${bgColor} ${borderColor}`}
            >
                <div className={`p-1 rounded-full ${iconColor}`}>
                    <Icon size={18} />
                </div>
                <AlertTitle className={titleColor}>
                    {toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}
                </AlertTitle>
                <AlertDescription className={textColor}>
                    {toast.message}
                </AlertDescription>
            </Alert>
        );
    };

    // Determine the step type and value
    const getStepTypeAndValue = (step) => {
        const key = Object.keys(step)[0];
        const value = step[key];
        return { type: key, value };
    };

    // Tab Button Component - reused from Rules
    const TabButton = ({ active, onClick, icon, label }) => (
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <div className="bg-indigo-700 shadow-lg">
                <div className="container mx-auto">
                    <div className="flex items-center justify-between h-16 px-4">
                        <div className="flex items-center space-x-2">
                            <Settings className="text-indigo-200" size={24} />
                            <span
                                className="text-white font-bold text-xl cursor-pointer"
                                onClick={() => handleNavigate("intents")}
                            >
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

                {/* Stories Content */}
                <div className="bg-white shadow rounded-lg">
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold text-gray-800">
                                Stories Configuration
                            </h1>
                            <div className="flex space-x-3">
                                <button
                                    onClick={addStory}
                                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                                >
                                    <Plus size={18} className="mr-2" />
                                    Add Story
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

                        {loading && !storiesData.stories?.length ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="text-indigo-600 animate-spin">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-8 w-8"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                        />
                                    </svg>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {storiesData.stories &&
                                    storiesData.stories.map(
                                        (story, storyIndex) => (
                                            <div
                                                key={storyIndex}
                                                className="bg-gray-50 rounded-lg p-5 shadow-sm border border-gray-200"
                                            >
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="w-2/3">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Story Name
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={
                                                                story.story ||
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                handleStoryChange(
                                                                    storyIndex,
                                                                    "story",
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className="w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                                            placeholder="Story name"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            removeStory(
                                                                storyIndex
                                                            )
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

                                                <div className="mt-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Steps
                                                    </label>

                                                    <div className="space-y-3 mb-4">
                                                        {story.steps &&
                                                            story.steps.map(
                                                                (
                                                                    step,
                                                                    stepIndex
                                                                ) => {
                                                                    const {
                                                                        type,
                                                                        value,
                                                                    } =
                                                                        getStepTypeAndValue(
                                                                            step
                                                                        );

                                                                    return (
                                                                        <div
                                                                            key={
                                                                                stepIndex
                                                                            }
                                                                            className="flex items-center space-x-2 bg-white p-3 rounded-md border border-gray-200"
                                                                        >
                                                                            <div className="flex-shrink-0">
                                                                                <select
                                                                                    value={
                                                                                        type
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) =>
                                                                                        handleStepTypeChange(
                                                                                            storyIndex,
                                                                                            stepIndex,
                                                                                            e
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                >
                                                                                    <option value="intent">
                                                                                        intent
                                                                                    </option>
                                                                                    <option value="action">
                                                                                        action
                                                                                    </option>
                                                                                    <option value="slot_was_set">
                                                                                        slot_was_set
                                                                                    </option>
                                                                                    <option value="active_loop">
                                                                                        active_loop
                                                                                    </option>
                                                                                </select>
                                                                            </div>

                                                                            <div className="flex-grow">
                                                                                <input
                                                                                    type="text"
                                                                                    value={
                                                                                        value ||
                                                                                        ""
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) =>
                                                                                        handleStepChange(
                                                                                            storyIndex,
                                                                                            stepIndex,
                                                                                            type,
                                                                                            e
                                                                                                .target
                                                                                                .value
                                                                                        )
                                                                                    }
                                                                                    className="w-full border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                                    placeholder={`${type} value`}
                                                                                />
                                                                            </div>

                                                                            <div className="flex space-x-1">
                                                                                <button
                                                                                    onClick={() =>
                                                                                        moveStep(
                                                                                            storyIndex,
                                                                                            stepIndex,
                                                                                            "up"
                                                                                        )
                                                                                    }
                                                                                    disabled={
                                                                                        stepIndex ===
                                                                                        0
                                                                                    }
                                                                                    className="p-1 text-gray-500 hover:text-indigo-600 disabled:text-gray-300"
                                                                                    title="Move up"
                                                                                >
                                                                                    <ArrowUp
                                                                                        size={
                                                                                            16
                                                                                        }
                                                                                    />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() =>
                                                                                        moveStep(
                                                                                            storyIndex,
                                                                                            stepIndex,
                                                                                            "down"
                                                                                        )
                                                                                    }
                                                                                    disabled={
                                                                                        stepIndex ===
                                                                                        story
                                                                                            .steps
                                                                                            .length -
                                                                                            1
                                                                                    }
                                                                                    className="p-1 text-gray-500 hover:text-indigo-600 disabled:text-gray-300"
                                                                                    title="Move down"
                                                                                >
                                                                                    <ArrowDown
                                                                                        size={
                                                                                            16
                                                                                        }
                                                                                    />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() =>
                                                                                        removeStep(
                                                                                            storyIndex,
                                                                                            stepIndex
                                                                                        )
                                                                                    }
                                                                                    className="p-1 text-red-500 hover:text-red-700"
                                                                                    title="Remove step"
                                                                                >
                                                                                    <MinusCircle
                                                                                        size={
                                                                                            16
                                                                                        }
                                                                                    />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                            )}
                                                    </div>

                                                    <button
                                                        onClick={() =>
                                                            addStep(storyIndex)
                                                        }
                                                        className="flex items-center text-sm px-3 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition-colors"
                                                    >
                                                        <PlusCircle
                                                            size={14}
                                                            className="mr-1"
                                                        />
                                                        Add Step
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    )}

                                {(!storiesData.stories ||
                                    storiesData.stories.length === 0) &&
                                    !loading && (
                                        <div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-300">
                                            <p className="text-gray-600">
                                                No stories defined yet
                                            </p>
                                            <button
                                                onClick={addStory}
                                                className="mt-4 flex items-center mx-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                                            >
                                                <Plus
                                                    size={18}
                                                    className="mr-2"
                                                />
                                                Add Your First Story
                                            </button>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Toast notification */}
            <ToastNotification />
        </div>
    );
};

export default Stories;
