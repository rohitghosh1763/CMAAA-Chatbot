import React, { useState, useEffect, useCallback } from "react";
import {
    Save, Plus, Trash2, Zap, AlertCircle, FileText, Code, Map, Database, Loader, Check, Settings, Edit3, ChevronDown, ChevronUp, MessageSquareText, Eye, Search, CalendarDays, Send, X
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from "@/components/ui/dialog"; // Assuming you have a Dialog component
import { AnimatePresence, motion } from "framer-motion";
import { format } from 'date-fns'; // For displaying dates

const UnknownQueries = () => {
    const [unknownQueries, setUnknownQueries] = useState([]);
    const [nluData, setNluData] = useState({ version: "3.1", nlu: [] });
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedQueryForAssignment, setSelectedQueryForAssignment] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [targetIntentName, setTargetIntentName] = useState("");

    // Pagination state (optional, can be added later if needed)
    // const [currentPage, setCurrentPage] = useState(1);
    // const [itemsPerPage, setItemsPerPage] = useState(10);

    const API_BASE_URL = "http://localhost:8000";

    const fetchNluData = useCallback(async () => {
        // setLoading(true); // Avoid double loading indicator if fetchUnknownQueries also sets it
        try {
            const response = await fetch(`${API_BASE_URL}/nlu`); //
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            setNluData(data.content || { version: "3.1", nlu: [] });
        } catch (err) {
            setToast({ type: "error", message: `Failed to fetch NLU data: ${err.message}` });
        }
        // setLoading(false);
    }, []);

    const fetchUnknownQueries = useCallback(async (params = {}) => {
        setLoading(true);
        let url = `${API_BASE_URL}/unknown-queries/search/?skip=${params.skip || 0}&limit=${params.limit || 100}`; //
        if (params.query_text) url += `&query_text=${encodeURIComponent(params.query_text)}`;
        if (params.date_from) url += `&date_from=${encodeURIComponent(params.date_from)}`;
        if (params.date_to) url += `&date_to=${encodeURIComponent(params.date_to)}`;

        try {
            const response = await fetch(url); //
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            setUnknownQueries(data || []);
        } catch (err) {
            setToast({ type: "error", message: `Failed to fetch unknown queries: ${err.message}` });
            setUnknownQueries([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUnknownQueries({ query_text: searchTerm, date_from: dateFrom, date_to: dateTo });
        fetchNluData();
    }, [fetchUnknownQueries, fetchNluData]); // Initial fetch

    const handleSearch = () => {
        fetchUnknownQueries({ query_text: searchTerm, date_from: dateFrom, date_to: dateTo });
    };
    
    const clearFilters = () => {
        setSearchTerm("");
        setDateFrom("");
        setDateTo("");
        fetchUnknownQueries({ query_text: "", date_from: "", date_to: "" });
    };


    const handleDeleteQuery = async (queryId) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/unknown-queries/${queryId}`, { method: "DELETE" }); //
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ detail: `HTTP error! Status: ${response.status}` }));
                 throw new Error(errorData.detail || `Failed to delete query.`);
            }
            setToast({ type: "success", message: "Query deleted successfully!" });
            fetchUnknownQueries({ query_text: searchTerm, date_from: dateFrom, date_to: dateTo }); // Refresh list
        } catch (err) {
            setToast({ type: "error", message: err.message });
        } finally {
            setLoading(false);
        }
    };

    const openAssignModal = (query) => {
        setSelectedQueryForAssignment(query);
        setTargetIntentName(""); // Reset selected intent
        setShowAssignModal(true);
    };

    const closeAssignModal = () => {
        setShowAssignModal(false);
        setSelectedQueryForAssignment(null);
    };

    const saveNluData = async (updatedNluContent) => {
        // This function is similar to handleSave in Intents.jsx
        // It ensures examples are formatted correctly before saving.
        setLoading(true);
        try {
            const dataToSave = { ...updatedNluContent };
            if (dataToSave.nlu) {
                dataToSave.nlu = dataToSave.nlu.map((intent) => {
                    if (intent.examples && typeof intent.examples === 'string') {
                        const lines = intent.examples.split("\n");
                        // Ensure each actual example line starts with "- " and filter empty lines
                        intent.examples = lines
                            .map(line => {
                                const trimmedLine = line.trim();
                                if (trimmedLine === "") return null; // Mark for removal
                                if (trimmedLine.startsWith("- ")) return trimmedLine;
                                return `- ${trimmedLine.replace(/^- /, "")}`; // Add dash if missing, remove if doubled
                            })
                            .filter(line => line !== null) // Remove empty lines
                            .join("\n");
                    }
                    return intent;
                });
            }

            const response = await fetch(`${API_BASE_URL}/nlu`, { //
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: dataToSave }),
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ detail: `HTTP error! Status: ${response.status}` }));
                 throw new Error(errorData.detail || `Failed to save NLU data.`);
            }
            await response.json();
            return true; // Indicate success
        } catch (err) {
            setToast({ type: "error", message: `Failed to save NLU data: ${err.message}` });
            return false; // Indicate failure
        } finally {
            setLoading(false);
        }
    };

    const handleAssignQuery = async () => {
        if (!selectedQueryForAssignment || !targetIntentName) {
            setToast({ type: "error", message: "No query or target intent selected." });
            return;
        }

        setLoading(true);
        const queryText = selectedQueryForAssignment.query.trim();
        const newNluData = JSON.parse(JSON.stringify(nluData)); // Deep copy

        const targetIntentIndex = newNluData.nlu.findIndex(i => i.intent === targetIntentName);

        if (targetIntentIndex > -1) {
            let currentExamples = newNluData.nlu[targetIntentIndex].examples || "";
            const newExampleLine = `- ${queryText}`;

            // Prevent adding duplicate examples
            const existingLines = currentExamples.split('\n').map(l => l.trim());
            if (existingLines.includes(newExampleLine)) {
                setToast({ type: "info", message: "This example already exists in the selected intent." });
                setLoading(false);
                // Optionally, still delete the unknown query if desired
                // await handleDeleteQuery(selectedQueryForAssignment.id);
                // closeAssignModal();
                return;
            }

            if (currentExamples === "") {
                newNluData.nlu[targetIntentIndex].examples = newExampleLine;
            } else {
                newNluData.nlu[targetIntentIndex].examples = currentExamples + "\n" + newExampleLine;
            }

            const nluSaveSuccess = await saveNluData(newNluData);

            if (nluSaveSuccess) {
                setToast({ type: "success", message: `Query assigned to intent '${targetIntentName}' and NLU data updated.` });
                await handleDeleteQuery(selectedQueryForAssignment.id); // Delete the unknown query
                fetchNluData(); // Refresh NLU data in state
                closeAssignModal();
            } else {
                // Error toast would have been shown by saveNluData
            }
        } else {
            setToast({ type: "error", message: "Target intent not found in NLU data." });
        }
        setLoading(false);
    };
    
    const handleTrain = async () => {
        setLoading(true);
        setToast({ type: "info", message: "Training model... This may take a while." });
        try {
            const response = await fetch(`${API_BASE_URL}/train`, { method: "POST" }); //
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || result.detail || `Training request failed. Status: ${response.status}`);
            }
            setToast({ type: "success", message: "Model training initiated successfully!" });
        } catch (err) {
             setToast({ type: "error", message: `Training failed: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    const ToastNotification = () => {
        useEffect(() => {
            if (toast) {
                const timer = setTimeout(() => setToast(null), 4000);
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
    

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white shadow-lg rounded-lg border border-slate-200 p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h1 className="text-2xl font-bold text-slate-800">
                            Unknown Queries Management
                        </h1>
                        <Button onClick={handleTrain} className="bg-purple-600 hover:bg-purple-700" disabled={loading}>
                            <Zap size={18} className="mr-2" /> {loading ? "Processing..." : "Train Model"}
                        </Button>
                    </div>

                    {/* Filters */}
                    <Card className="mb-6 border border-slate-300 shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg text-slate-700">Filter Queries</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div>
                                    <Label htmlFor="search-term" className="text-sm font-medium text-slate-600">Search Text</Label>
                                    <Input
                                        id="search-term"
                                        type="text"
                                        placeholder="Enter query text..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="date-from" className="text-sm font-medium text-slate-600">Date From</Label>
                                    <Input
                                        id="date-from"
                                        type="date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="date-to" className="text-sm font-medium text-slate-600">Date To</Label>
                                    <Input
                                        id="date-to"
                                        type="date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 pt-3">
                            <Button variant="outline" onClick={clearFilters} className="text-slate-600 border-slate-400 hover:bg-slate-100">
                                <X size={16} className="mr-2" /> Clear
                            </Button>
                            <Button onClick={handleSearch} className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
                                <Search size={18} className="mr-2" /> {loading ? "Searching..." : "Search"}
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Query List */}
                    {loading && unknownQueries.length === 0 ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader size={32} className="text-indigo-600 animate-spin" />
                            <p className="ml-3 text-slate-600">Loading unknown queries...</p>
                        </div>
                    ) : unknownQueries.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {unknownQueries.map((uq) => (
                                <Card key={uq.id} className="border border-slate-300 shadow-md hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base font-semibold text-indigo-700 break-all">"{uq.query}"</CardTitle>
                                        <CardDescription className="text-xs text-slate-500 mt-1">
                                            <CalendarDays size={12} className="inline mr-1" /> 
                                            Logged: {format(new Date(uq.timestamp), "PPpp")}
                                        </CardDescription>
                                    </CardHeader>
                                    {uq.intent_ranking && uq.intent_ranking.length > 0 && (
                                        <CardContent className="py-2 text-xs">
                                            <p className="font-medium text-slate-600 mb-0.5">Top detected intents:</p>
                                            <ul className="list-disc list-inside pl-1 space-y-0.5">
                                                {uq.intent_ranking.slice(0, 2).map(rank => (
                                                    <li key={rank.name} className="text-slate-500">
                                                        {rank.name} (Confidence: {(rank.confidence * 100).toFixed(1)}%)
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    )}
                                    <CardFooter className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                                        <Button variant="outline" size="sm" className="text-xs border-sky-600 text-sky-600 hover:bg-sky-50" onClick={() => openAssignModal(uq)} disabled={loading}>
                                            <Send size={14} className="mr-1.5" /> Assign to Intent
                                        </Button>
                                        <Button variant="destructive" size="sm" className="text-xs bg-red-500 hover:bg-red-600" onClick={() => handleDeleteQuery(uq.id)} disabled={loading}>
                                            <Trash2 size={14} className="mr-1.5" /> Delete
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 col-span-full">
                            <FileText size={48} className="mx-auto text-slate-400 mb-3" />
                            <p className="text-slate-600 text-lg">No unknown queries found.</p>
                            <p className="text-slate-500 text-sm">Try adjusting your filters or check back later.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Assign to Intent Modal */}
            <AnimatePresence>
            {showAssignModal && selectedQueryForAssignment && (
                <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
                    <DialogContent className="sm:max-w-[425px] bg-white rounded-lg shadow-xl">
                         <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                            <DialogHeader>
                                <DialogTitle className="text-xl text-slate-800">Assign Query to Intent</DialogTitle>
                                <DialogDescription className="text-sm text-slate-600 mt-1">
                                    Add the query <strong className="text-indigo-600">"{selectedQueryForAssignment.query}"</strong> as an example to an existing intent.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-3">
                                <Label htmlFor="intent-select" className="text-sm font-medium text-slate-700">Select Intent</Label>
                                <Select onValueChange={setTargetIntentName} value={targetIntentName}>
                                    <SelectTrigger id="intent-select" className="w-full border-slate-300 focus:border-indigo-500 focus:ring-indigo-500">
                                        <SelectValue placeholder="Choose an intent..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(nluData.nlu || []).length > 0 ? (
                                            nluData.nlu.map(intent => (
                                                <SelectItem key={intent.intent} value={intent.intent}>
                                                    {intent.intent}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="px-2 py-3 text-center text-sm text-slate-500">No intents found. Fetching...</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter className="mt-2">
                                <DialogClose asChild>
                                     <Button type="button" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-100" onClick={closeAssignModal}>
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button 
                                    type="button" 
                                    onClick={handleAssignQuery} 
                                    disabled={loading || !targetIntentName}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {loading ? <><Loader size={16} className="animate-spin mr-2" /> Assigning...</> : <><Send size={16} className="mr-2" /> Assign & Save NLU</>}
                                </Button>
                            </DialogFooter>
                         </motion.div>
                    </DialogContent>
                </Dialog>
            )}
            </AnimatePresence>

            <AnimatePresence>
                {toast && <ToastNotification />}
            </AnimatePresence>
        </div>
    );
};

export default UnknownQueries;