import React, { useState, useEffect } from "react";
import {
    Save, Plus, Trash2, Zap, AlertCircle, FileText, Code, Map, Database, Loader, Check, Settings, Edit3, ChevronDown, ChevronUp, MessageSquareText, Eye
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const Intents = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState("intents");
    const [nluData, setNluData] = useState({ version: "3.1", nlu: [] });
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [editingIntentName, setEditingIntentName] = useState(null);
    const [expandedCardIndex, setExpandedCardIndex] = useState(null); // Track single expanded card

    useEffect(() => {
        const path = location.pathname.replace("/", "") || "intents";
        setActiveTab(path);
    }, [location]);
    const handleSave = async () => {
        setLoading(true);
        try {
            const dataToSave = { ...nluData };
            if (dataToSave.nlu) {
                dataToSave.nlu = dataToSave.nlu.map((intent) => {
                    if (intent.examples) {
                        const lines = intent.examples.split("\n");
                        intent.examples = lines
                            .map((line) => line.trim() ? (line.startsWith("- ") ? line : `- ${line}`) : line)
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
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            await response.json();
            setToast({ type: "success", message: "Changes saved successfully!" });
        } catch (err) {
            setToast({ type: "error", message: `Failed to save changes: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleTrain = async () => {
        setLoading(true);
        setToast({ type: "info", message: "Training model... This may take a while." });
        try {
            const response = await fetch("http://localhost:8000/train", { method: "POST" });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            await response.json();
            setToast({ type: "success", message: "Model trained successfully!" });
        } catch (err) {
             setToast({ type: "error", message: `Training failed: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (route) => {
        setActiveTab(route);
        navigate(`/${route}`);
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
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            const processedData = { ...data.content };
            if (processedData.nlu) {
                processedData.nlu = processedData.nlu.map((intent) => {
                    if (intent.examples && typeof intent.examples === "string") {
                        let cleanExamples = intent.examples.replace(/\\n/g, "\n");
                        cleanExamples = cleanExamples.replace(/^["'](.*)["']$/s, "$1");
                        const lines = cleanExamples.split("\n");
                        cleanExamples = lines
                            .map((line) => line.trim() ? (line.startsWith("- ") ? line : `- ${line}`) : line)
                            .join("\n");
                        return { ...intent, examples: cleanExamples };
                    }
                    return intent;
                });
            }
            setNluData(processedData);
            setExpandedCardIndex(null); // Initialize with no cards expanded
        } catch (err) {
            setToast({ type: "error", message: `Failed to fetch NLU data: ${err.message}` });
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
            .map((line) => line.trim() ? (line.startsWith("- ") ? line : `- ${line}`) : line)
            .join("\n");
        updatedNlu[index] = { ...updatedNlu[index], examples: formattedValue };
        setNluData({ ...nluData, nlu: updatedNlu });
    };

    const addIntent = () => {
        const newIntent = { intent: `new_intent_${(nluData.nlu?.length || 0) + 1}`, examples: "- example1\n- example2" };
        const updatedNluData = nluData.nlu ? [newIntent, ...nluData.nlu] : [newIntent];
        setNluData({ ...nluData, nlu: updatedNluData });
        setExpandedCardIndex(0); // Expand the new card (index 0) and collapse others
    };

    const removeIntent = (index) => {
        const updatedNlu = [...nluData.nlu];
        updatedNlu.splice(index, 1);
        setNluData({ ...nluData, nlu: updatedNlu });
        
        // Adjust the expanded index
        setExpandedCardIndex(prevIndex => {
            if (prevIndex === null) return null;
            if (prevIndex === index) return null;
            if (prevIndex > index) return prevIndex - 1;
            return prevIndex;
        });
    };

    const toggleCardExpansion = (index) => {
        if (editingIntentName && editingIntentName.index === index) {
            handleIntentNameSave(index);
        }
        setExpandedCardIndex(prevIndex => prevIndex === index ? null : index);
    };

    const startEditingIntentName = (index, name, e) => {
        e.stopPropagation();
        setEditingIntentName({ index, name });
    };

    const handleIntentNameSave = (index) => {
        if (editingIntentName && editingIntentName.index === index) {
            const newName = editingIntentName.name.trim();
            if (newName === "") {
                setToast({ type: "error", message: "Intent name cannot be empty." });
                setEditingIntentName(null);
                return;
            }
            handleIntentChange(index, "intent", newName);
            setEditingIntentName(null);
        }
    };
    
    const handleIntentNameInputChange = (e) => {
        if (editingIntentName !== null) {
            setEditingIntentName({...editingIntentName, name: e.target.value});
        }
    };

    const formatExamples = (examplesString) => {
        if (!examplesString) return [];
        return examplesString.split("\n").filter((line) => line.trim().startsWith("-")).map((line) => line.trim().substring(1).trim());
    };

    const ToastNotification = () => {
        useEffect(() => {
            if (toast) {
                const timer = setTimeout(() => setToast(null), 3000);
                return () => clearTimeout(timer);
            }
        }, [toast]);

        if (!toast) return null;

        const alertVariants = {
            success: "border-green-500 bg-green-50 text-green-700",
            error: "border-red-500 bg-red-50 text-red-700",
            info: "border-blue-500 bg-blue-50 text-blue-700",
        };
        const iconColorVariants = {
            success: "text-green-500",
            error: "text-red-500",
            info: "text-blue-500",
        }
        

        return (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-4 right-4 z-50 w-auto max-w-md"
            >
                <Alert className={`${alertVariants[toast.type || 'info']} shadow-lg`}>
                     <div className={`p-1 rounded-full ${iconColorVariants[toast.type || 'info']}`}>
                        {toast.type === "success" && <Check size={18} />}
                        {toast.type === "error" && <AlertCircle size={18} />}
                        {toast.type === "info" && <AlertCircle size={18} />}
                    </div>
                    <AlertTitle className={`font-semibold ${toast.type === "success" ? "text-green-800" : toast.type === "error" ? "text-red-800" : "text-blue-800"}`}>
                        {toast.type === "success" ? "Success" : toast.type === "error" ? "Error" : "Info"}
                    </AlertTitle>
                    <AlertDescription>
                        {toast.message}
                    </AlertDescription>
                </Alert>
            </motion.div>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case "intents":
                return (
                    <div className="p-4 md:p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                            <h1 className="text-2xl font-bold text-slate-800">
                                Intent Management
                            </h1>
                            <div className="flex space-x-2 sm:space-x-3">
                                <Button onClick={addIntent} variant="default" className="bg-indigo-600 hover:bg-indigo-700">
                                    <Plus size={18} className="mr-2" /> Add Intent
                                </Button>
                                <Button onClick={handleSave} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700" disabled={loading || !nluData.nlu || nluData.nlu.length === 0}>
                                    <Save size={18} className="mr-2" /> {loading && nluData.nlu ? "Saving..." : "Save"}
                                </Button>
                                <Button onClick={handleTrain} className="bg-purple-600 hover:bg-purple-700" disabled={loading || !nluData.nlu || nluData.nlu.length === 0}>
                                    <Zap size={18} className="mr-2" /> {loading ? "Training..." : "Train"}
                                </Button>
                            </div>
                        </div>

                        {loading && (!nluData.nlu || nluData.nlu.length === 0) ? (
                            <div className="flex justify-center items-center py-12">
                                <Loader size={32} className="text-indigo-600 animate-spin" />
                                <p className="ml-2 text-slate-600">Loading intents...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                <AnimatePresence>
                                    {nluData.nlu && nluData.nlu.map((intent, index) => (
                                        <motion.div
                                            key={intent.intent + index}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.25, ease: "easeInOut" }}
                                        >
                                            <Card className={`border border-slate-300 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden ${expandedCardIndex === index ? 'bg-white' : 'bg-slate-50 hover:bg-slate-100'}`}>
                                                <CardHeader 
                                                    className="p-3 cursor-pointer border-b border-slate-200"
                                                    onClick={() => toggleCardExpansion(index)}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        {editingIntentName?.index === index ? (
                                                            <Input
                                                                type="text"
                                                                value={editingIntentName.name}
                                                                onChange={handleIntentNameInputChange}
                                                                onBlur={() => handleIntentNameSave(index)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleIntentNameSave(index);
                                                                    if (e.key === 'Escape') setEditingIntentName(null);
                                                                }}
                                                                className="text-base font-semibold h-8 flex-grow mr-2"
                                                                autoFocus
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        ) : (
                                                            <CardTitle className="text-base font-semibold text-indigo-700 truncate flex-grow" title={intent.intent || "Untitled Intent"}>
                                                                {intent.intent || "Untitled Intent"}
                                                            </CardTitle>
                                                        )}
                                                        <div className="flex items-center shrink-0">
                                                            {!editingIntentName || editingIntentName?.index !== index ? (
                                                              <Button variant="ghost" size="icon" className="text-slate-500 hover:text-indigo-600 w-7 h-7" onClick={(e) => startEditingIntentName(index, intent.intent || "", e)}>
                                                                  <Edit3 size={14} />
                                                              </Button>
                                                            ) : (
                                                                <Button variant="ghost" size="icon" className="text-green-500 hover:text-green-700 w-7 h-7" onClick={(e) => {e.stopPropagation(); handleIntentNameSave(index)}}>
                                                                    <Check size={16} />
                                                                </Button>
                                                            )}
                                                            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 w-7 h-7 ml-1">
                                                                {expandedCardIndex === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <CardDescription className="text-xs text-slate-500 mt-0.5">
                                                        <MessageSquareText size={12} className="inline mr-1" />
                                                        {formatExamples(intent.examples).length} example(s)
                                                    </CardDescription>
                                                </CardHeader>
                                                
                                                <AnimatePresence>
                                                {expandedCardIndex === index && (
                                                    <motion.section
                                                        key="content"
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto", transition: { duration: 0.3, ease: "easeInOut" } }}
                                                        exit={{ opacity: 0, height: 0, transition: { duration: 0.2, ease: "easeInOut" } }}
                                                        className="overflow-hidden"
                                                    >
                                                        <CardContent className="p-3 space-y-3">
                                                            <div>
                                                                <Label htmlFor={`examples-${index}`} className="text-xs font-medium text-slate-700 mb-1 block">
                                                                    Examples <span className="text-slate-500">(one per line, start with '-')</span>
                                                                </Label>
                                                                <Textarea
                                                                    id={`examples-${index}`}
                                                                    value={intent.examples || ""}
                                                                    onChange={(e) => handleExamplesChange(index, e.target.value)}
                                                                    className="w-full h-32 font-mono text-xs border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                                                                    placeholder="- example 1&#10;- example 2"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs font-medium text-slate-700 mb-1 block">
                                                                    <Eye size={12} className="inline mr-1" /> Preview
                                                                </Label>
                                                                <div className="bg-slate-50 rounded-md border border-slate-200 p-2 h-28 overflow-y-auto">
                                                                    {formatExamples(intent.examples).length > 0 ? (
                                                                        <ul className="space-y-0.5">
                                                                            {formatExamples(intent.examples).map((example, i) => (
                                                                                <li key={i} className="text-slate-600 text-[11px] py-0.5 px-1.5 bg-slate-100 rounded border border-slate-200 truncate" title={example}>
                                                                                    "{example}"
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    ) : (
                                                                        <p className="text-xs text-slate-400 italic text-center mt-4">No examples formatted correctly.</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                        <CardFooter className="p-3 border-t border-slate-200">
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={(e) => { e.stopPropagation(); removeIntent(index); }}
                                                                className="w-full bg-red-500 hover:bg-red-600 text-white text-xs"
                                                            >
                                                                <Trash2 size={14} className="mr-1.5" /> Remove Intent
                                                            </Button>
                                                        </CardFooter>
                                                    </motion.section>
                                                )}
                                                </AnimatePresence>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                         {nluData.nlu && nluData.nlu.length === 0 && !loading && (
                            <div className="text-center py-12 col-span-full">
                                <FileText size={48} className="mx-auto text-slate-400 mb-3" />
                                <p className="text-slate-600 text-lg">No intents created yet.</p>
                                <p className="text-slate-500 text-sm">Click "Add Intent" to get started.</p>
                            </div>
                        )}
                    </div>
                );
            case "rules":
                 return (
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-slate-800 mb-6">Rules Configuration</h1>
                        <div className="bg-slate-50 rounded-lg p-8 text-center border border-dashed border-slate-300">
                            <Code size={48} className="mx-auto text-slate-400 mb-3" />
                            <p className="text-slate-600">Rules editor will be implemented here.</p>
                            <p className="text-sm text-slate-500 mt-2">Define conversation rules and response patterns.</p>
                            <Button onClick={() => handleNavigate("rules")} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                                Configure Rules
                            </Button>
                        </div>
                    </div>
                );
            case "stories":
                 return (
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-slate-800 mb-6">Stories Management</h1>
                        <div className="bg-slate-50 rounded-lg p-8 text-center border border-dashed border-slate-300">
                            <Map size={48} className="mx-auto text-slate-400 mb-3" />
                            <p className="text-slate-600">Stories editor will be implemented here.</p>
                            <p className="text-sm text-slate-500 mt-2">Create and manage conversational flows.</p>
                            <Button onClick={() => handleNavigate("stories")} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                                Manage Stories
                            </Button>
                        </div>
                    </div>
                );
            case "domain":
                return (
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-slate-800 mb-6">Domain Configuration</h1>
                        <div className="bg-slate-50 rounded-lg p-8 text-center border border-dashed border-slate-300">
                            <Database size={48} className="mx-auto text-slate-400 mb-3" />
                            <p className="text-slate-600">Domain editor will be implemented here.</p>
                            <p className="text-sm text-slate-500 mt-2">Define responses, forms, and entities.</p>
                           <Button onClick={() => handleNavigate("domain")} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                                Configure Domain
                            </Button>
                        </div>
                    </div>
                );
            case "unknown":
                return (
                    <div className="p-6">
                        <h1 className="text-2xl font-bold text-slate-800 mb-6">Unknown Queries</h1>
                        <div className="bg-slate-50 rounded-lg p-8 text-center border border-dashed border-slate-300">
                            <AlertCircle size={48} className="mx-auto text-slate-400 mb-3" />
                            <p className="text-slate-600">Unknown queries analysis will be implemented here.</p>
                            <p className="text-sm text-slate-500 mt-2">Review and handle user inputs without matching intents.</p>
                            <Button onClick={() => handleNavigate("unknown")} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                                Analyze Queries
                            </Button>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white shadow-lg rounded-lg border border-slate-200">
                    {renderContent()}
                </div>
            </div>
            <AnimatePresence>
                {toast && <ToastNotification />}
            </AnimatePresence>
        </div>
    );
};

export default Intents;

