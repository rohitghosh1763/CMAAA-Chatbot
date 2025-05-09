import React, { useState, useEffect } from "react";
import {
    Save, Plus, Trash2, Zap, AlertCircle, Check, Settings, FileText, Code, Map, Database,
    ChevronDown, ChevronUp, Edit3, ArrowUp, ArrowDown, PlusCircle, MinusCircle, ListChecks, GripVertical,
    Loader
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

const Rules = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState("rules");
    const [rulesData, setRulesData] = useState({ version: "3.1", rules: [] });
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [editingRuleName, setEditingRuleName] = useState(null);
    const [expandedCards, setExpandedCards] = useState({});

    useEffect(() => {
        const path = location.pathname.replace("/", "") || "rules";
        setActiveTab(path);
    }, [location]);

    // Removed handleNavigate as it's part of Navbar.jsx

    useEffect(() => {
        if (activeTab === "rules") {
            fetchRulesData();
        }
    }, [activeTab]);

    const fetchRulesData = async () => {
        setLoading(true);
        try {
            const response = await fetch("http://localhost:8000/rules");
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            const contentRules = data.content?.rules || [];
            setRulesData({ version: data.content?.version || "3.1", rules: contentRules });

            const initialExpandedState = {};
            contentRules.forEach((_, index) => {
                initialExpandedState[index] = false;
            });
            setExpandedCards(initialExpandedState);
        } catch (err) {
            setToast({ type: "error", message: `Failed to fetch rules data: ${err.message}` });
            setRulesData({ version: "3.1", rules: [] });
        } finally {
            setLoading(false);
        }
    };

    const handleRuleNameChange = (index, newName) => {
        const updatedRules = [...rulesData.rules];
        updatedRules[index] = { ...updatedRules[index], rule: newName };
        setRulesData({ ...rulesData, rules: updatedRules });
    };

    const startEditingRuleName = (index, name, e) => {
        e.stopPropagation();
        setEditingRuleName({ index, name });
    };

    const handleRuleNameSave = (index) => {
        if (editingRuleName && editingRuleName.index === index) {
            const newName = editingRuleName.name.trim();
            if (newName === "") {
                setToast({ type: "error", message: "Rule name cannot be empty." });
                return;
            }
            handleRuleNameChange(index, newName);
            setEditingRuleName(null);
        }
    };

    const handleRuleNameInputChange = (e) => {
        if (editingRuleName !== null) {
            setEditingRuleName({ ...editingRuleName, name: e.target.value });
        }
    };

    const addRule = () => {
        const newRule = {
            rule: `New Rule ${(rulesData.rules?.length || 0) + 1}`,
            steps: [{ intent: "example_intent" }, { action: "utter_greet" }],
        };
        const updatedRules = [newRule, ...(rulesData.rules || [])];
        setRulesData({ ...rulesData, rules: updatedRules });

        const newExpandedCards = { 0: true }; // Expand the new rule
        Object.keys(expandedCards).forEach(key => {
            newExpandedCards[parseInt(key) + 1] = expandedCards[key];
        });
        setExpandedCards(newExpandedCards);
    };

    const removeRule = (index) => {
        const updatedRules = rulesData.rules.filter((_, i) => i !== index);
        setRulesData({ ...rulesData, rules: updatedRules });

        setExpandedCards(prev => {
            const newExpanded = {};
            updatedRules.forEach((_, i) => {
                const originalOldIndex = i < index ? i : i + 1;
                 if (prev[originalOldIndex] !== undefined) {
                    newExpanded[i] = prev[originalOldIndex];
                } else {
                    const correspondingOldKey = Object.keys(prev).find(k => parseInt(k) === originalOldIndex);
                    if(correspondingOldKey !== undefined) {
                        newExpanded[i] = prev[correspondingOldKey];
                    } else {
                        newExpanded[i] = false;
                    }
                }
            });
            Object.keys(newExpanded).forEach(key => {
                if (parseInt(key) >= updatedRules.length) {
                    delete newExpanded[key];
                }
            });
            return newExpanded;
        });
    };

    const addStep = (ruleIndex) => {
        const updatedRules = [...rulesData.rules];
        const currentSteps = updatedRules[ruleIndex].steps || [];
        updatedRules[ruleIndex].steps = [...currentSteps, { action: "new_action" }];
        setRulesData({ ...rulesData, rules: updatedRules });
    };

    const removeStep = (ruleIndex, stepIndex) => {
        const updatedRules = [...rulesData.rules];
        updatedRules[ruleIndex].steps.splice(stepIndex, 1);
        setRulesData({ ...rulesData, rules: updatedRules });
    };

    const moveStep = (ruleIndex, stepIndex, direction) => {
        const updatedRules = [...rulesData.rules];
        const steps = updatedRules[ruleIndex].steps;
        if (direction === "up" && stepIndex > 0) {
            [steps[stepIndex], steps[stepIndex - 1]] = [steps[stepIndex - 1], steps[stepIndex]];
        } else if (direction === "down" && stepIndex < steps.length - 1) {
            [steps[stepIndex], steps[stepIndex + 1]] = [steps[stepIndex + 1], steps[stepIndex]];
        }
        setRulesData({ ...rulesData, rules: updatedRules });
    };

    const handleStepChange = (ruleIndex, stepIndex, key, value) => {
        const updatedRules = [...rulesData.rules];
        if (updatedRules[ruleIndex].steps[stepIndex]) {
            updatedRules[ruleIndex].steps[stepIndex] = { [key]: value };
        }
        setRulesData({ ...rulesData, rules: updatedRules });
    };

    const handleStepTypeChange = (ruleIndex, stepIndex, newType) => {
        const updatedRules = [...rulesData.rules];
        const currentStep = updatedRules[ruleIndex].steps[stepIndex];
        const currentValue = Object.values(currentStep)[0] || "";
        updatedRules[ruleIndex].steps[stepIndex] = { [newType]: currentValue };
        setRulesData({ ...rulesData, rules: updatedRules });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch("http://localhost:8000/rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: rulesData }),
            });
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            await response.json();
            setToast({ type: "success", message: "Rules saved successfully!" });
        } catch (err) {
            setToast({ type: "error", message: `Failed to save rules: ${err.message}` });
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
            success: "text-green-500", error: "text-red-500", info: "text-blue-500",
        };

        return (
            <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="fixed top-4 right-4 z-50 w-auto max-w-md"
            >
                <Alert className={`${alertVariants[toast.type || 'info']} shadow-lg flex items-start p-3`}>
                    <div className={`p-1 rounded-full ${iconColorVariants[toast.type || 'info']} mr-3 mt-0.5`}>
                        {toast.type === "success" && <Check size={18} />}
                        {toast.type === "error" && <AlertCircle size={18} />}
                        {toast.type === "info" && <AlertCircle size={18} />}
                    </div>
                    <div>
                        <AlertTitle className={`font-semibold ${toast.type === "success" ? "text-green-800" : toast.type === "error" ? "text-red-800" : "text-blue-800"}`}>
                            {toast.type === "success" ? "Success" : toast.type === "error" ? "Error" : "Info"}
                        </AlertTitle>
                        <AlertDescription className="text-sm">{toast.message}</AlertDescription>
                    </div>
                </Alert>
            </motion.div>
        );
    };

    const getStepTypeAndValue = (step) => {
        const key = Object.keys(step)[0];
        const value = step[key];
        return { type: key, value };
    };

    const toggleCardExpansion = (index) => {
        if (editingRuleName && editingRuleName.index === index) {
            handleRuleNameSave(index);
        }
        setExpandedCards(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const renderRulesContent = () => (
        <div className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-slate-800">Rules Configuration</h1>
                <div className="flex space-x-2 sm:space-x-3">
                    <Button onClick={addRule} variant="default" className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus size={18} className="mr-2" /> Add Rule
                    </Button>
                    <Button onClick={handleSave} variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700" disabled={loading || !rulesData.rules || rulesData.rules.length === 0}>
                        <Save size={18} className="mr-2" /> {loading ? "Saving..." : "Save"}
                    </Button>
                    <Button onClick={handleTrain} className="bg-purple-600 hover:bg-purple-700" disabled={loading || !rulesData.rules || rulesData.rules.length === 0}>
                        <Zap size={18} className="mr-2" /> {loading ? "Training..." : "Train"}
                    </Button>
                </div>
            </div>

            {loading && (!rulesData.rules || rulesData.rules.length === 0) ? (
                <div className="flex justify-center items-center py-12">
                    <Loader size={32} className="text-indigo-600 animate-spin" />
                    <p className="ml-2 text-slate-600">Loading rules...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                    <AnimatePresence>
                        {rulesData.rules && rulesData.rules.map((rule, ruleIndex) => (
                            <motion.div
                                key={rule.id || `rule-${ruleIndex}`}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.25, ease: "easeInOut" }}
                            >
                                <Card className={`border border-slate-300 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden ${expandedCards[ruleIndex] ? 'bg-white' : 'bg-slate-50 hover:bg-slate-100'}`}>
                                    <CardHeader
                                        className="p-3 cursor-pointer border-b border-slate-200"
                                        onClick={() => toggleCardExpansion(ruleIndex)}
                                    >
                                        <div className="flex justify-between items-start gap-x-2">
                                            <div className="flex-1 min-w-0">
                                                {editingRuleName?.index === ruleIndex ? (
                                                    <Input
                                                        type="text"
                                                        value={editingRuleName.name}
                                                        onChange={handleRuleNameInputChange}
                                                        onBlur={() => handleRuleNameSave(ruleIndex)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') { e.preventDefault(); handleRuleNameSave(ruleIndex); }
                                                            if (e.key === 'Escape') setEditingRuleName(null);
                                                        }}
                                                        className="text-base font-semibold w-full h-8 bg-transparent p-0 border-0 focus:ring-0 focus:outline-none"
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <CardTitle
                                                        className="text-base font-semibold text-indigo-700 break-words"
                                                        title={rule.rule || "Untitled Rule"}
                                                    >
                                                        {rule.rule || "Untitled Rule"}
                                                    </CardTitle>
                                                )}
                                            </div>
                                            <div className="flex items-center shrink-0">
                                                {!editingRuleName || editingRuleName?.index !== ruleIndex ? (
                                                    <Button variant="ghost" size="icon" className="text-slate-500 hover:text-indigo-600 w-7 h-7" onClick={(e) => startEditingRuleName(ruleIndex, rule.rule || "", e)} title="Edit rule name"> <Edit3 size={14} /> </Button>
                                                ) : (
                                                    <Button variant="ghost" size="icon" className="text-green-500 hover:text-green-700 w-7 h-7" onClick={(e) => { e.stopPropagation(); handleRuleNameSave(ruleIndex); }} title="Save rule name"> <Check size={16} /> </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 w-7 h-7 ml-1" title={expandedCards[ruleIndex] ? "Collapse rule" : "Expand rule"}>
                                                    {expandedCards[ruleIndex] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                                </Button>
                                            </div>
                                        </div>
                                        <CardDescription className="text-xs text-slate-500 mt-1.5">
                                            <ListChecks size={12} className="inline mr-1 align-middle" />
                                            {rule.steps?.length || 0} step(s)
                                        </CardDescription>
                                    </CardHeader>

                                    <AnimatePresence>
                                        {expandedCards[ruleIndex] && (
                                            <motion.section
                                                key="content"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto", transition: { duration: 0.3, ease: "easeInOut" } }}
                                                exit={{ opacity: 0, height: 0, transition: { duration: 0.2, ease: "easeInOut" } }}
                                                className="overflow-hidden"
                                            >
                                                <CardContent className="p-3 space-y-3">
                                                    <Label className="text-xs font-medium text-slate-700 block mb-1">Steps</Label>
                                                    {rule.steps && rule.steps.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {rule.steps.map((step, stepIndex) => {
                                                                const { type, value } = getStepTypeAndValue(step);
                                                                return (
                                                                    <motion.div
                                                                        key={step.id || `step-${ruleIndex}-${stepIndex}`}
                                                                        layout="position" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} transition={{ duration: 0.2 }}
                                                                        className="flex items-center space-x-2 bg-slate-50 p-2 rounded border border-slate-200"
                                                                    >
                                                                        <GripVertical size={16} className="text-slate-400 cursor-grab flex-shrink-0" />
                                                                        <Select value={type} onValueChange={(newType) => handleStepTypeChange(ruleIndex, stepIndex, newType)}>
                                                                            <SelectTrigger className="w-[130px] h-8 text-xs border-slate-300 flex-shrink-0">
                                                                                <SelectValue placeholder="Type" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="intent">Intent</SelectItem>
                                                                                <SelectItem value="action">Action</SelectItem>
                                                                                <SelectItem value="slot_was_set">Slot Set</SelectItem>
                                                                                <SelectItem value="active_loop">Active Loop</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                        
                                                                        <div className="flex-1 min-w-0">
                                                                            <Input
                                                                                type="text" value={value || ""}
                                                                                onChange={(e) => handleStepChange(ruleIndex, stepIndex, type, e.target.value)}
                                                                                placeholder={`${type} value`}
                                                                                className="max-w-35 h-8 text-xs border-slate-300" 
                                                                            />
                                                                        </div>

                                                                        <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-500 hover:text-indigo-600 disabled:text-slate-300 flex-shrink-0" onClick={() => moveStep(ruleIndex, stepIndex, "up")} disabled={stepIndex === 0} title="Move up"> <ArrowUp size={14} /> </Button>
                                                                        <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-500 hover:text-indigo-600 disabled:text-slate-300 flex-shrink-0" onClick={() => moveStep(ruleIndex, stepIndex, "down")} disabled={stepIndex === rule.steps.length - 1} title="Move down"> <ArrowDown size={14} /> </Button>
                                                                        <Button variant="ghost" size="icon" className="w-7 h-7 text-red-500 hover:text-red-700 flex-shrink-0" onClick={() => removeStep(ruleIndex, stepIndex)} title="Remove step"> <MinusCircle size={14} /> </Button>
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-slate-400 italic text-center py-2">No steps in this rule.</p>
                                                    )}
                                                    <Button size="sm" variant="outline" className="text-xs border-indigo-500 text-indigo-600 hover:bg-indigo-50 w-full mt-2" onClick={() => addStep(ruleIndex)}>
                                                        <PlusCircle size={14} className="mr-1.5" /> Add Step
                                                    </Button>
                                                </CardContent>
                                                <CardFooter className="p-3 border-t border-slate-200">
                                                    <Button variant="destructive" size="sm" className="w-full text-xs" onClick={(e) => { e.stopPropagation(); removeRule(ruleIndex); }}>
                                                        <Trash2 size={14} className="mr-1.5" /> Remove Rule
                                                    </Button>
                                                </CardFooter>
                                            </motion.section>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {rulesData.rules && rulesData.rules.length === 0 && !loading && (
                        <div className="text-center py-12 col-span-full">
                            <Code size={48} className="mx-auto text-slate-400 mb-3" />
                            <p className="text-slate-600 text-lg">No rules defined yet.</p>
                            <p className="text-slate-500 text-sm">Click "Add Rule" to create conversation flows.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // TabButton component removed

    return (
        <div className="min-h-screen bg-slate-100">
            {/* Navbar and Tab container removed */}
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white shadow-lg rounded-lg border border-slate-200">
                    {activeTab === "rules" ? renderRulesContent() :
                        <div className="p-6 text-slate-500">Content for {activeTab} will be shown here.</div>}
                </div>
            </div>
            <AnimatePresence>
                {toast && <ToastNotification />}
            </AnimatePresence>
        </div>
    );
};

export default Rules;