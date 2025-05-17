import React, { useState, useEffect, useCallback } from 'react';
import {
    Save, Plus, Trash2, Zap, AlertCircle, Check, Settings, FileText, Code, Map, Database,
    ChevronDown, ChevronUp, Edit3, ArrowUp, ArrowDown, PlusCircle, MinusCircle, ListChecks, GripVertical,
    Loader, Package, ZapOff, SlidersHorizontal, MessageSquare, Puzzle, Settings2, Clock
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AnimatePresence, motion } from 'framer-motion';

const initialDomainState = {
    version: "3.1",
    intents: [],
    entities: [],
    slots: {},
    responses: {},
    actions: [],
    forms: {},
    session_config: {
        session_expiration_time: 60,
        carry_over_slots_to_new_session: true,
    },
};

const Domain = () => {
    const [domainData, setDomainData] = useState(initialDomainState);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [expandedCards, setExpandedCards] = useState({});

    const API_URL = "http://localhost:8000/domain"; // Replace with your actual API URL if different

    const fetchDomainData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            const fetchedContent = data.content || {};
            const newDomainData = {
                version: fetchedContent.version || "3.1",
                intents: fetchedContent.intents || [],
                entities: fetchedContent.entities || [],
                slots: fetchedContent.slots || {},
                responses: fetchedContent.responses || {},
                actions: fetchedContent.actions || [],
                forms: fetchedContent.forms || {},
                session_config: fetchedContent.session_config || {
                    session_expiration_time: 60,
                    carry_over_slots_to_new_session: true,
                },
            };
            setDomainData(newDomainData);
            const initialExpanded = {};
            ['intents', 'entities', 'slots', 'responses', 'actions', 'forms', 'session_config'].forEach(key => {
                initialExpanded[key] = false;
            });
            setExpandedCards(initialExpanded);

        } catch (err) {
            setToast({ type: "error", message: `Failed to fetch domain data: ${err.message}` });
            setDomainData(initialDomainState);
            const initialExpanded = {};
            ['intents', 'entities', 'slots', 'responses', 'actions', 'forms', 'session_config'].forEach(key => {
                initialExpanded[key] = false;
            });
            setExpandedCards(initialExpanded);
        } finally {
            setLoading(false);
        }
    }, [API_URL]);

    useEffect(() => {
        fetchDomainData();
    }, [fetchDomainData]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = { ...domainData };
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: payload }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Unknown error during save." }));
                throw new Error(`HTTP error! Status: ${response.status}. ${errorData.detail}`);
            }
            await response.json();
            setToast({ type: "success", message: "Domain configuration saved successfully!" });
            fetchDomainData();
        } catch (err) {
            setToast({ type: "error", message: `Failed to save domain: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    const handleListChange = (section, index, field, value) => {
        setDomainData(prev => {
            const newList = [...(prev[section] || [])];
            if (typeof field === 'string') {
                newList[index] = { ...(newList[index] || {}), [field]: value };
            } else {
                newList[index] = value;
            }
            return { ...prev, [section]: newList };
        });
    };

    const addListItem = (section, newItemTemplate) => {
        setDomainData(prev => ({
            ...prev,
            [section]: [...(prev[section] || []), newItemTemplate]
        }));
    };

    const removeListItem = (section, index) => {
        setDomainData(prev => ({
            ...prev,
            [section]: (prev[section] || []).filter((_, i) => i !== index)
        }));
    };

    const handleResponseTextChange = (responseName, index, newText) => {
        setDomainData(prev => {
            const updatedResponses = { ...prev.responses };
            if (updatedResponses[responseName] && updatedResponses[responseName][index]) {
                updatedResponses[responseName][index].text = newText;
            }
            return { ...prev, responses: updatedResponses };
        });
    };

    const addVariationToResponse = (responseName) => {
        setDomainData(prev => {
            const updatedResponses = { ...prev.responses };
            if (!updatedResponses[responseName]) {
                updatedResponses[responseName] = [];
            }
            updatedResponses[responseName].push({ text: "" }); // Start with empty text for new variation
            return { ...prev, responses: updatedResponses };
        });
    };

    const removeVariationFromResponse = (responseName, index) => {
        setDomainData(prev => {
            const updatedResponses = { ...prev.responses };
            if (updatedResponses[responseName]) {
                updatedResponses[responseName].splice(index, 1);
                // Do not delete the response key if all variations are removed, user might want to add new ones.
                // If you want to delete the key if empty:
                // if (updatedResponses[responseName].length === 0) {
                //     delete updatedResponses[responseName];
                // }
            }
            return { ...prev, responses: updatedResponses };
        });
    };

    const addNewResponseKey = (newResponseName) => {
        const trimmedName = newResponseName.trim();
        if (!trimmedName) {
            setToast({ type: "error", message: "Response name cannot be empty." });
            return false;
        }
        if (domainData.responses[trimmedName]) {
            setToast({ type: "error", message: "Response name already exists." });
            return false;
        }
        setDomainData(prev => ({
            ...prev,
            responses: {
                ...prev.responses,
                [trimmedName]: [{ text: "New response text" }]
            }
        }));
        return true;
    };

    const removeResponseKey = (responseName) => {
        setDomainData(prev => {
            const updatedResponses = { ...prev.responses };
            delete updatedResponses[responseName];
            return { ...prev, responses: updatedResponses };
        });
    };

    const handleSlotChange = (slotName, field, value) => {
        setDomainData(prev => ({
            ...prev,
            slots: {
                ...prev.slots,
                [slotName]: {
                    ...(prev.slots[slotName] || {}),
                    [field]: value
                }
            }
        }));
    };

    const addSlot = (newSlotName) => {
        const trimmedName = newSlotName.trim();
        if (!trimmedName || domainData.slots[trimmedName]) {
            setToast({ type: "error", message: "Slot name already exists or is empty." });
            return false;
        }
        setDomainData(prev => ({
            ...prev,
            slots: {
                ...prev.slots,
                [trimmedName]: { type: 'text', influence_conversation: true, mappings: [] }
            }
        }));
        return true;
    };

    const removeSlot = (slotName) => {
        setDomainData(prev => {
            const updatedSlots = { ...prev.slots };
            delete updatedSlots[slotName];
            return { ...prev, slots: updatedSlots };
        });
    };

    const toggleCardExpansion = (clickedKey) => {
        setExpandedCards(prevExpanded => {
            const newExpandedState = {};
            const isCurrentlyOpen = prevExpanded[clickedKey];
            Object.keys(prevExpanded).forEach(key => {
                newExpandedState[key] = false;
            });
            if (!isCurrentlyOpen) {
                newExpandedState[clickedKey] = true;
            }
            return newExpandedState;
        });
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

    const renderSectionHeader = (title, sectionKey, icon) => (
        <CardHeader
            className="p-3 cursor-pointer border-b border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors duration-150"
            onClick={() => toggleCardExpansion(sectionKey)}
        >
            <div className="flex justify-between items-center">
                <div className="flex items-center">
                    {icon && React.cloneElement(icon, { size: 20, className: "mr-2 text-indigo-600" })}
                    <CardTitle className="text-lg font-semibold text-indigo-700">{title}</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 w-8 h-8">
                    {expandedCards[sectionKey] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </Button>
            </div>
        </CardHeader>
    );

    if (loading && domainData.intents.length === 0 && Object.keys(domainData.slots).length === 0) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-100">
                <Loader size={48} className="text-indigo-600 animate-spin" />
                <p className="ml-3 text-slate-700 text-lg">Loading Domain Configuration...</p>
            </div>
        );
    }

    const responsesCardClasses = expandedCards.responses
        ? "shadow-lg w-full"
        : "shadow-lg flex-shrink-0 w-96";

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-6">
            <div className="container mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold text-slate-800">Domain Configuration</h1>
                    <div className="flex space-x-2 sm:space-x-3">
                        <Button onClick={handleSave} variant="default" className="bg-green-600 hover:bg-green-700" disabled={loading}>
                            <Save size={18} className="mr-2" /> {loading ? "Saving..." : "Save Domain"}
                        </Button>
                        <Button onClick={() => { setToast({ type: "info", message: "Train button clicked (not implemented)" }) }} className="bg-purple-600 hover:bg-purple-700" disabled={loading}>
                            <Zap size={18} className="mr-2" /> {loading ? "Training..." : "Train"}
                        </Button>
                    </div>
                </div>

                <div className="flex flex-row flex-wrap py-4 gap-6">

                    <Card className="shadow-lg flex-shrink-0 w-96">
                        {renderSectionHeader("Intents", "intents", <Zap />)}
                        <AnimatePresence>
                            {expandedCards.intents && (
                                <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                                    <CardContent className="p-4 space-y-3">
                                        {domainData.intents.map((intent, index) => (
                                            <div key={`intent-${index}`} className="flex items-center space-x-2 p-3 bg-white border border-slate-200 rounded-md shadow-sm">
                                                <Input
                                                    type="text"
                                                    value={typeof intent === 'string' ? intent : intent.name || ''}
                                                    placeholder="Intent name (e.g., greet)"
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (typeof intent === 'string') {
                                                            handleListChange("intents", index, null, val);
                                                        } else {
                                                            handleListChange("intents", index, "name", val);
                                                        }
                                                    }}
                                                    className="flex-grow"
                                                />
                                                <Button variant="ghost" size="icon" onClick={() => removeListItem("intents", index)} className="text-red-500 hover:text-red-700">
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button onClick={() => addListItem("intents", { name: "", use_entities: true, ignore_entities: [] })} variant="outline" className="w-full border-indigo-500 text-indigo-600 hover:bg-indigo-50">
                                            <PlusCircle size={16} className="mr-2" /> Add Intent
                                        </Button>
                                    </CardContent>
                                </motion.section>
                            )}
                        </AnimatePresence>
                    </Card>

                    <Card className="shadow-lg flex-shrink-0 w-96">
                        {renderSectionHeader("Entities", "entities", <Package />)}
                        <AnimatePresence>
                            {expandedCards.entities && (
                                <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                                    <CardContent className="p-4 space-y-3">
                                        {domainData.entities.map((entity, index) => (
                                            <div key={`entity-${index}`} className="flex items-center space-x-2 p-3 bg-white border border-slate-200 rounded-md shadow-sm">
                                                <Input
                                                    type="text"
                                                    value={typeof entity === 'string' ? entity : (entity && entity.name) || ''}
                                                    placeholder="Entity name (e.g., location)"
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (typeof entity === 'string') {
                                                            handleListChange("entities", index, null, val);
                                                        } else {
                                                            handleListChange("entities", index, "name", val);
                                                        }
                                                    }}
                                                    className="flex-grow"
                                                />
                                                <Button variant="ghost" size="icon" onClick={() => removeListItem("entities", index)} className="text-red-500 hover:text-red-700">
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button onClick={() => addListItem("entities", "")} variant="outline" className="w-full border-indigo-500 text-indigo-600 hover:bg-indigo-50">
                                            <PlusCircle size={16} className="mr-2" /> Add Entity
                                        </Button>
                                    </CardContent>
                                </motion.section>
                            )}
                        </AnimatePresence>
                    </Card>

                    <Card className="shadow-lg flex-shrink-0 w-96">
                        {renderSectionHeader("Slots", "slots", <SlidersHorizontal />)}
                        <AnimatePresence>
                            {expandedCards.slots && (
                                <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                                    <CardContent className="p-4 space-y-4">
                                        {Object.entries(domainData.slots).map(([slotName, slotConfig]) => (
                                            <Card key={`slot-${slotName}`} className="p-4 bg-white border-slate-200 shadow">
                                                <CardHeader className="p-0 pb-3 mb-3 border-b">
                                                    <div className="flex justify-between items-center">
                                                        <Input
                                                            value={slotName}
                                                            readOnly
                                                            className="text-md font-semibold text-slate-700 border-0 p-0 focus-visible:ring-0 bg-transparent"
                                                        />
                                                        <Button variant="ghost" size="icon" onClick={() => removeSlot(slotName)} className="text-red-500 hover:text-red-700">
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-0 space-y-3">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <Label htmlFor={`slot-type-${slotName}`} className="text-xs text-slate-600">Type</Label>
                                                            <Select
                                                                value={slotConfig.type}
                                                                onValueChange={(value) => handleSlotChange(slotName, "type", value)}
                                                            >
                                                                <SelectTrigger id={`slot-type-${slotName}`}> <SelectValue placeholder="Select type" /> </SelectTrigger>
                                                                <SelectContent>
                                                                    {['text', 'bool', 'float', 'list', 'categorical', 'any'].map(type => (
                                                                        <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Label htmlFor={`slot-initial-${slotName}`} className="text-xs text-slate-600">Initial Value (optional)</Label>
                                                            <Input
                                                                id={`slot-initial-${slotName}`}
                                                                value={slotConfig.initial_value || ""}
                                                                onChange={(e) => handleSlotChange(slotName, "initial_value", e.target.value)}
                                                                placeholder="e.g., true or default_text"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2 pt-2">
                                                        <Switch
                                                            id={`slot-influence-${slotName}`}
                                                            checked={!!slotConfig.influence_conversation} // Ensure boolean
                                                            onCheckedChange={(checked) => handleSlotChange(slotName, "influence_conversation", checked)}
                                                        />
                                                        <Label htmlFor={`slot-influence-${slotName}`} className="text-sm">Influence Conversation</Label>
                                                    </div>
                                                    <div className="mt-2">
                                                        <Label className="text-xs text-slate-600">Mappings (Advanced)</Label>
                                                        <Textarea
                                                            value={typeof slotConfig.mappings === 'string' ? slotConfig.mappings : JSON.stringify(slotConfig.mappings || [], null, 2)}
                                                            rows={3}
                                                            className="font-mono text-xs"
                                                            placeholder='Enter mappings as JSON array e.g., [{"type": "from_entity", "entity": "example"}]'
                                                            onChange={(e) => {
                                                                let valueToSet = e.target.value;
                                                                try {
                                                                    valueToSet = JSON.parse(e.target.value);
                                                                } catch (err) {
                                                                    // If not valid JSON, store as string (user might be typing)
                                                                }
                                                                handleSlotChange(slotName, "mappings", valueToSet);
                                                            }}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        <div className="mt-4 flex items-center space-x-2">
                                            <Input
                                                id="newSlotNameInput"
                                                placeholder="New slot name"
                                                className="flex-grow"
                                                onKeyDown={(e) => { if (e.key === 'Enter') { if (addSlot(e.target.value)) e.target.value = ''; } }}
                                            />
                                            <Button
                                                onClick={() => {
                                                    const inputEl = document.getElementById('newSlotNameInput');
                                                    if (inputEl && inputEl.value) {
                                                        if (addSlot(inputEl.value)) inputEl.value = '';
                                                    }
                                                }}
                                                variant="outline" className="border-indigo-500 text-indigo-600 hover:bg-indigo-50">
                                                <PlusCircle size={16} className="mr-2" /> Add Slot
                                            </Button>
                                        </div>
                                    </CardContent>
                                </motion.section>
                            )}
                        </AnimatePresence>
                    </Card>

                    <Card className="shadow-lg flex-shrink-0 w-96">
                        {renderSectionHeader("Actions", "actions", <Puzzle />)}
                        <AnimatePresence>
                            {expandedCards.actions && (
                                <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                                    <CardContent className="p-4 space-y-3">
                                        {domainData.actions.map((actionName, index) => (
                                            <div key={`action-${index}`} className="flex items-center space-x-2 p-3 bg-white border border-slate-200 rounded-md shadow-sm">
                                                <Input
                                                    type="text"
                                                    value={actionName}
                                                    placeholder="Action name (e.g., action_calculate_sum)"
                                                    onChange={(e) => handleListChange("actions", index, null, e.target.value)}
                                                    className="flex-grow"
                                                />
                                                <Button variant="ghost" size="icon" onClick={() => removeListItem("actions", index)} className="text-red-500 hover:text-red-700">
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button onClick={() => addListItem("actions", "new_action_name")} variant="outline" className="w-full border-indigo-500 text-indigo-600 hover:bg-indigo-50">
                                            <PlusCircle size={16} className="mr-2" /> Add Action
                                        </Button>
                                    </CardContent>
                                </motion.section>
                            )}
                        </AnimatePresence>
                    </Card>

                    <Card className="shadow-lg flex-shrink-0 w-96">
                        {renderSectionHeader("Forms", "forms", <FileText />)}
                        <AnimatePresence>
                            {expandedCards.forms && (
                                <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                                    <CardContent className="p-4">
                                        <p className="text-slate-500 text-sm">Forms configuration UI is complex. Edit as JSON below.</p>
                                        <Textarea
                                            value={JSON.stringify(domainData.forms, null, 2)}
                                            rows={10}
                                            className="font-mono text-xs mt-2 w-full"
                                            onChange={(e) => {
                                                try {
                                                    const newForms = JSON.parse(e.target.value);
                                                    setDomainData(prev => ({ ...prev, forms: newForms }));
                                                } catch (err) {
                                                    setToast({ type: "error", message: "Invalid JSON for forms." })
                                                }
                                            }}
                                            placeholder="Define forms as JSON here..."
                                        />
                                    </CardContent>
                                </motion.section>
                            )}
                        </AnimatePresence>
                    </Card>

                    <Card className="shadow-lg flex-shrink-0 w-96">
                        {renderSectionHeader("Session Configuration", "session_config", <Settings2 />)}
                        <AnimatePresence>
                            {expandedCards.session_config && (
                                <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                                    <CardContent className="p-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                            <div>
                                                <Label htmlFor="session-expiration" className="text-sm font-medium text-slate-700">Session Expiration Time (minutes)</Label>
                                                <Input
                                                    id="session-expiration"
                                                    type="number"
                                                    min="0"
                                                    value={domainData.session_config.session_expiration_time}
                                                    onChange={(e) => setDomainData(prev => ({ ...prev, session_config: { ...prev.session_config, session_expiration_time: parseInt(e.target.value, 10) || 0 } }))}
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div className="flex items-center space-x-3 pt-6 md:pt-0 md:mt-6">
                                                <Switch
                                                    id="carry-over-slots"
                                                    checked={!!domainData.session_config.carry_over_slots_to_new_session}
                                                    onCheckedChange={(checked) => setDomainData(prev => ({ ...prev, session_config: { ...prev.session_config, carry_over_slots_to_new_session: checked } }))}
                                                />
                                                <Label htmlFor="carry-over-slots" className="text-sm font-medium text-slate-700">Carry Over Slots</Label>
                                            </div>
                                        </div>
                                    </CardContent>
                                </motion.section>
                            )}
                        </AnimatePresence>
                    </Card>

                    {/* Optimized Responses Card */}
                    <Card className={responsesCardClasses}>
                        {renderSectionHeader("Responses", "responses", <MessageSquare />)}
                        <AnimatePresence>
                            {expandedCards.responses && (
                                <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                                    <CardContent className="p-3 space-y-4"> {/* Increased spacing between response groups */}
                                        <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-slate-200">
                                            <Input
                                                id="newResponseNameInput"
                                                placeholder="New response name (e.g., utter_greet)"
                                                className="flex-grow"
                                                onKeyDown={(e) => { if (e.key === 'Enter') { if (addNewResponseKey(e.target.value)) e.target.value = ''; } }}
                                            />
                                            <Button
                                                onClick={() => {
                                                    const inputEl = document.getElementById('newResponseNameInput');
                                                    if (inputEl && inputEl.value) {
                                                        if (addNewResponseKey(inputEl.value)) inputEl.value = '';
                                                    }
                                                }}
                                                variant="outline" className="border-indigo-500 text-indigo-600 hover:bg-indigo-50">
                                                <PlusCircle size={16} className="mr-2" /> Add Response Key
                                            </Button>
                                        </div>

                                        {Object.entries(domainData.responses).map(([responseName, variations]) => (
                                            <Card key={`response-group-${responseName}`} className="bg-white border-slate-200 shadow-sm overflow-hidden">
                                                <CardHeader className="p-3 bg-slate-50 border-b flex justify-between items-center sticky top-0 z-10">
                                                    <Input
                                                        value={responseName}
                                                        readOnly
                                                        className="text-md font-semibold text-slate-700 border-0 p-0 focus-visible:ring-0 flex-grow mr-2 bg-transparent truncate"
                                                        title={responseName} // Show full name on hover if truncated
                                                    />
                                                    <div className="flex items-center flex-shrink-0 space-x-1">
                                                        <Button variant="outline" size="sm" onClick={() => addVariationToResponse(responseName)} className="text-xs border-green-500 text-green-600 hover:bg-green-50 px-2 py-1 h-auto">
                                                            <Plus size={14} className="mr-1" /> Variation
                                                        </Button>
                                                        <Button variant="ghost" size="icon" onClick={() => removeResponseKey(responseName)} className="text-red-500 hover:text-red-700 w-7 h-7" title={`Delete ${responseName}`}>
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </CardHeader>
                                                <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
                                                    {variations.map((variation, varIndex) => (
                                                        <div key={`response-var-${responseName}-${varIndex}`} className="flex items-start space-x-2 p-2 bg-slate-50/70 border border-slate-200 rounded-md shadow-xs">
                                                            <Textarea
                                                                id={`response-text-${responseName}-${varIndex}`}
                                                                value={variation.text || ""}
                                                                onChange={(e) => handleResponseTextChange(responseName, varIndex, e.target.value)}
                                                                placeholder={`Variation ${varIndex + 1} text`}
                                                                rows={2}
                                                                className="flex-grow text-sm leading-snug resize-none"
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeVariationFromResponse(responseName, varIndex)}
                                                                className="text-red-500 hover:text-red-600 flex-shrink-0 w-7 h-7 p-1 mt-1"
                                                                title="Remove variation"
                                                            >
                                                                <MinusCircle size={16} />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    {variations.length === 0 && (
                                                        <p className="text-sm text-slate-500 text-center py-4">
                                                            No variations for <strong className="font-medium">{responseName}</strong> yet.
                                                            Click the "+ Variation" button above to add one.
                                                        </p>
                                                    )}
                                                </div>
                                            </Card>
                                        ))}
                                         {Object.keys(domainData.responses).length === 0 && (
                                            <p className="text-slate-500 text-center py-6">No responses defined. Add a new response key above to get started.</p>
                                        )}
                                    </CardContent>
                                </motion.section>
                            )}
                        </AnimatePresence>
                    </Card>
                </div>

                <AnimatePresence>
                    {toast && <ToastNotification />}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Domain;