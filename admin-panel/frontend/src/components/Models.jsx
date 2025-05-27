import React, { useState, useEffect, useCallback } from "react";
import {
    Trash2, AlertCircle, FileText, CheckCircle, Package, Clock, Loader as IconLoader, RefreshCw,
    PlayCircle, StopCircle, Server, Settings // Added Settings icon for Actions server
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";
import { format } from 'date-fns';

const ACTIVE_MODEL_FILENAME_DISPLAY = "active_model.tar.gz"; // From backend config

const Models = () => {
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(false); // For model list loading
    const [actionLoading, setActionLoading] = useState({ type: null, modelName: null }); // For activate/delete model actions
    const [toast, setToast] = useState(null);

    const [rasaStatus, setRasaStatus] = useState({ status: "loading", message: null, pid: null, model_name: null, port: null, log_file: null });
    const [isRasaCmdLoading, setIsRasaCmdLoading] = useState(false); // For start/stop Rasa API actions

    const [rasaActionsStatus, setRasaActionsStatus] = useState({ status: "loading", message: null, pid: null, port: null, log_file: null });
    const [isRasaActionsCmdLoading, setIsRasaActionsCmdLoading] = useState(false); // For start/stop Rasa Actions server

    const API_BASE_URL = "http://localhost:8000";

    const fetchModels = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/models`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Failed to fetch models" }));
                throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            setModels(data);
        } catch (err) {
            setToast({ type: "error", message: err.message });
            setModels([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchRasaApiServiceStatus = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/rasa/status`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Failed to fetch Rasa API status" }));
                throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            setRasaStatus(data);
        } catch (err) {
            setRasaStatus({ status: "error", message: err.message, pid: null, model_name: null, port: null, log_file: null });
            console.error("Failed to fetch Rasa API status:", err.message);
        }
    }, []);

    const fetchRasaActionsServiceStatus = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/rasa/actions/status`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: "Failed to fetch Rasa Actions status" }));
                throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            setRasaActionsStatus(data);
        } catch (err) {
            setRasaActionsStatus({ status: "error", message: err.message, pid: null, port: null, log_file: null });
            console.error("Failed to fetch Rasa Actions status:", err.message);
        }
    }, []);
    


    useEffect(() => {
        fetchModels();
        fetchRasaApiServiceStatus();
        fetchRasaActionsServiceStatus();
        
    }, [fetchModels, fetchRasaApiServiceStatus, fetchRasaActionsServiceStatus]);

    const handleActivateModel = async (modelName) => {
        setActionLoading({ type: 'activate', modelName });
        try {
            const response = await fetch(`${API_BASE_URL}/models/activate/${modelName}`, { method: "POST" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || `HTTP error! Status: ${response.status}`);
            setToast({ type: "success", message: result.message || `Model ${modelName} activated.` });
            fetchModels();
            fetchRasaApiServiceStatus(); 
        } catch (err) {
            setToast({ type: "error", message: `Failed to activate model '${modelName}': ${err.message}` });
        } finally {
            setActionLoading({ type: null, modelName: null });
        }
    };

    const handleDeleteModel = async (modelName) => {
        if (!window.confirm(`Are you sure you want to delete the model "${modelName}"? This action cannot be undone.`)) return;
        setActionLoading({ type: 'delete', modelName });
        try {
            const response = await fetch(`${API_BASE_URL}/models/${modelName}`, { method: "DELETE" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || `HTTP error! Status: ${response.status}`);
            setToast({ type: "success", message: result.message || `Model ${modelName} deleted.` });
            fetchModels();
            fetchRasaApiServiceStatus(); 
        } catch (err) {
            setToast({ type: "error", message: `Failed to delete model '${modelName}': ${err.message}` });
        } finally {
            setActionLoading({ type: null, modelName: null });
        }
    };
    
    const handleStartRasaAPI = async () => {
        setIsRasaCmdLoading(true);
        setToast(null);
        try {
            const response = await fetch(`${API_BASE_URL}/rasa/start`, { method: "POST" });
            const result = await response.json(); 
            if (!response.ok) {
                throw new Error(result.detail || `HTTP error! Status: ${response.status}`);
            }
            setToast({ type: "success", message: result.message || "Rasa API starting..." });
        } catch (err) {
            setToast({ type: "error", message: `Failed to start Rasa API: ${err.message}` });
        } finally {
            setTimeout(() => {
                fetchRasaApiServiceStatus();
                setIsRasaCmdLoading(false);
            }, 2500); // Increased delay for stability
        }
    };

    const handleStopRasaAPI = async () => {
        setIsRasaCmdLoading(true);
        setToast(null);
        try {
            const response = await fetch(`${API_BASE_URL}/rasa/stop`, { method: "POST" });
            const result = await response.json(); 
            if (!response.ok) {
                throw new Error(result.detail || `HTTP error! Status: ${response.status}`);
            }
            setToast({ type: "success", message: result.message || "Rasa API stopping..." });
        } catch (err) {
            setToast({ type: "error", message: `Failed to stop Rasa API: ${err.message}` });
        } finally {
            setTimeout(() => {
                fetchRasaApiServiceStatus();
                setIsRasaCmdLoading(false);
            }, 2500);
        }
    };

    const handleStartRasaActions = async () => {
        setIsRasaActionsCmdLoading(true);
        setToast(null);
        try {
            const response = await fetch(`${API_BASE_URL}/rasa/actions/start`, { method: "POST" });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.detail || `HTTP error! Status: ${response.status}`);
            }
            setToast({ type: "success", message: result.message || "Rasa Actions server starting..." });
        } catch (err) {
            setToast({ type: "error", message: `Failed to start Rasa Actions server: ${err.message}` });
        } finally {
            setTimeout(() => {
                fetchRasaActionsServiceStatus();
                setIsRasaActionsCmdLoading(false);
            }, 2500); 
        }
    };

    const handleStopRasaActions = async () => {
        setIsRasaActionsCmdLoading(true);
        setToast(null);
        try {
            const response = await fetch(`${API_BASE_URL}/rasa/actions/stop`, { method: "POST" });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.detail || `HTTP error! Status: ${response.status}`);
            }
            setToast({ type: "success", message: result.message || "Rasa Actions server stopping..." });
        } catch (err) {
            setToast({ type: "error", message: `Failed to stop Rasa Actions server: ${err.message}` });
        } finally {
            setTimeout(() => {
                fetchRasaActionsServiceStatus();
                setIsRasaActionsCmdLoading(false);
            }, 2500);
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
            success: "text-green-500", error: "text-red-500", info: "text-blue-500",
        };
        
        return (
            <motion.div
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="fixed top-4 right-4 z-50 w-auto max-w-md"
            >
                <Alert className={`${alertVariants[toast.type || 'info']} shadow-lg`}>
                    <div className={`p-1 rounded-full ${iconColorVariants[toast.type || 'info']} mr-2`}> {/* Added mr-2 for spacing */}
                        {toast.type === "success" && <CheckCircle size={18} />}
                        {toast.type === "error" && <AlertCircle size={18} />}
                        {toast.type === "info" && <AlertCircle size={18} />}
                    </div>
                    <div className="flex-grow"> {/* Ensure title and description take remaining space */}
                        <AlertTitle className={`font-semibold ${toast.type === "success" ? "text-green-800" : toast.type === "error" ? "text-red-800" : "text-blue-800"}`}>
                            {toast.type === "success" ? "Success" : toast.type === "error" ? "Error" : "Info"}
                        </AlertTitle>
                        <AlertDescription>{toast.message}</AlertDescription>
                    </div>
                </Alert>
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="container mx-auto px-4 py-6">
                <div className="bg-white shadow-lg rounded-lg border border-slate-200">
                    <div className="p-4 md:p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                            <h1 className="text-2xl font-bold text-slate-800">Model & Server Management</h1>
                            <Button 
                                onClick={() => { fetchModels(); fetchRasaApiServiceStatus(); fetchRasaActionsServiceStatus(); }} 
                                variant="outline" 
                                className="border-blue-600 text-blue-600 hover:bg-blue-50 hover:text-blue-700" 
                                disabled={loading || isRasaCmdLoading || isRasaActionsCmdLoading || (actionLoading.type !== null)}
                            >
                                <RefreshCw size={18} className={`mr-2 ${(loading || isRasaCmdLoading || isRasaActionsCmdLoading) ? 'animate-spin' : ''}`} /> Refresh All
                            </Button>
                        </div>

                        {/* Server Control Sections */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Rasa API Control Section */}
                            <Card className="border-slate-300 shadow">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center text-slate-700">
                                        <Server size={20} className="mr-3 text-indigo-600" /> Rasa API Service
                                    </CardTitle>
                                    <CardDescription>Control the Rasa NLU/Core API server.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex items-center">
                                        <strong className="w-24 shrink-0">Status:</strong>
                                        {rasaStatus.status === 'loading' ? (
                                            <span className="italic text-slate-500">Loading...</span>
                                        ) : rasaStatus.status === 'running' ? (
                                            <span className="font-semibold text-green-600 py-0.5 px-2 bg-green-100 rounded-md">Running</span>
                                        ) : rasaStatus.status === 'stopped' ? (
                                            <span className="font-semibold text-red-600 py-0.5 px-2 bg-red-100 rounded-md">Stopped</span>
                                        ) : (
                                            <span className="font-semibold text-orange-500 py-0.5 px-2 bg-orange-100 rounded-md">Error/Unknown</span>
                                        )}
                                        {rasaStatus.pid && <span className="text-xs text-slate-400 ml-2">(PID: {rasaStatus.pid})</span>}
                                    </div>
                                    {rasaStatus.status === 'running' && (
                                        <>
                                            {rasaStatus.model_name && rasaStatus.model_name !== "N/A (active model file missing)" && (
                                                <div className="flex items-center">
                                                    <strong className="w-24 shrink-0">Model:</strong>
                                                    <span className="text-slate-700 truncate" title={rasaStatus.model_name}>{rasaStatus.model_name}</span>
                                                </div>
                                            )}
                                            {rasaStatus.port && (
                                                <div className="flex items-center">
                                                    <strong className="w-24 shrink-0">Port:</strong>
                                                    <span className="text-slate-700">{rasaStatus.port}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {(rasaStatus.status === 'error' || (rasaStatus.status === 'running' && rasaStatus.model_name && rasaStatus.model_name.includes("missing"))) && rasaStatus.message && (
                                        <div className="text-red-600 bg-red-50 p-2 rounded-md text-xs">
                                            <strong className="block">Details:</strong> {rasaStatus.message}
                                        </div>
                                    )}
                                    {rasaStatus.log_file && (
                                        <div className="flex items-center">
                                            <strong className="w-24 shrink-0">Logs:</strong>
                                            <code className="text-xs bg-slate-100 p-1 rounded border border-slate-200 truncate" title={rasaStatus.log_file}>{rasaStatus.log_file}</code>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                    <Button onClick={handleStartRasaAPI} disabled={rasaStatus.status === 'running' || rasaStatus.status === 'loading' || isRasaCmdLoading || isRasaActionsCmdLoading} className="w-full sm:flex-1 bg-green-500 hover:bg-green-600 text-white disabled:bg-slate-300">
                                        {isRasaCmdLoading && rasaStatus.status !== 'running' ? <IconLoader size={18} className="mr-2 animate-spin" /> : <PlayCircle size={18} className="mr-2" />} Start API
                                    </Button>
                                    <Button onClick={handleStopRasaAPI} disabled={rasaStatus.status !== 'running' || isRasaCmdLoading || isRasaActionsCmdLoading} className="w-full sm:flex-1 bg-red-500 hover:bg-red-600 text-white disabled:bg-slate-300">
                                        {isRasaCmdLoading && rasaStatus.status === 'running' ? <IconLoader size={18} className="mr-2 animate-spin" /> : <StopCircle size={18} className="mr-2" />} Stop API
                                    </Button>
                                </CardFooter>
                            </Card>

                            {/* Rasa Actions Service Control Section */}
                            <Card className="border-slate-300 shadow">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center text-slate-700">
                                        <Settings size={20} className="mr-3 text-sky-600" /> Rasa Actions Service
                                    </CardTitle>
                                    <CardDescription>Control the custom Rasa Actions server.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex items-center">
                                        <strong className="w-24 shrink-0">Status:</strong>
                                        {rasaActionsStatus.status === 'loading' ? (
                                            <span className="italic text-slate-500">Loading...</span>
                                        ) : rasaActionsStatus.status === 'running' ? (
                                            <span className="font-semibold text-green-600 py-0.5 px-2 bg-green-100 rounded-md">Running</span>
                                        ) : rasaActionsStatus.status === 'stopped' ? (
                                            <span className="font-semibold text-red-600 py-0.5 px-2 bg-red-100 rounded-md">Stopped</span>
                                        ) : (
                                            <span className="font-semibold text-orange-500 py-0.5 px-2 bg-orange-100 rounded-md">Error/Unknown</span>
                                        )}
                                        {rasaActionsStatus.pid && <span className="text-xs text-slate-400 ml-2">(PID: {rasaActionsStatus.pid})</span>}
                                    </div>
                                    {rasaActionsStatus.status === 'running' && rasaActionsStatus.port && (
                                        <div className="flex items-center">
                                            <strong className="w-24 shrink-0">Port:</strong>
                                            <span className="text-slate-700">{rasaActionsStatus.port}</span>
                                        </div>
                                    )}
                                    {rasaActionsStatus.status === 'error' && rasaActionsStatus.message && (
                                         <div className="text-red-600 bg-red-50 p-2 rounded-md text-xs">
                                            <strong className="block">Details:</strong> {rasaActionsStatus.message}
                                        </div>
                                    )}
                                    {rasaActionsStatus.log_file && (
                                        <div className="flex items-center">
                                            <strong className="w-24 shrink-0">Logs:</strong>
                                            <code className="text-xs bg-slate-100 p-1 rounded border border-slate-200 truncate" title={rasaActionsStatus.log_file}>{rasaActionsStatus.log_file}</code>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                    <Button onClick={handleStartRasaActions} disabled={rasaActionsStatus.status === 'running' || rasaActionsStatus.status === 'loading' || isRasaActionsCmdLoading || isRasaCmdLoading} className="w-full sm:flex-1 bg-sky-500 hover:bg-sky-600 text-white disabled:bg-slate-300">
                                        {isRasaActionsCmdLoading && rasaActionsStatus.status !== 'running' ? <IconLoader size={18} className="mr-2 animate-spin" /> : <PlayCircle size={18} className="mr-2" />} Start Actions
                                    </Button>
                                    <Button onClick={handleStopRasaActions} disabled={rasaActionsStatus.status !== 'running' || isRasaActionsCmdLoading || isRasaCmdLoading} className="w-full sm:flex-1 bg-orange-500 hover:bg-orange-600 text-white disabled:bg-slate-300">
                                        {isRasaActionsCmdLoading && rasaActionsStatus.status === 'running' ? <IconLoader size={18} className="mr-2 animate-spin" /> : <StopCircle size={18} className="mr-2" />} Stop Actions
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                        
                        <h2 className="text-xl font-semibold text-slate-700 mb-3 mt-8">Available Models</h2>
                        {loading ? (
                            <div className="flex justify-center items-center py-12"><IconLoader size={32} className="text-indigo-600 animate-spin" /><p className="ml-2 text-slate-600">Loading models...</p></div>
                        ) : models.length === 0 ? (
                            <div className="text-center py-12 col-span-full"><Package size={48} className="mx-auto text-slate-400 mb-3" /><p className="text-slate-600 text-lg">No models found.</p><p className="text-slate-500 text-sm">Train a new model. Models will appear in the 'models' directory.</p></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <AnimatePresence>
                                    {models.map((model) => (
                                        <motion.div key={model.name} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.25, ease: "easeInOut" }}>
                                            <Card className={`border shadow-md hover:shadow-lg transition-shadow duration-300 ${model.is_active ? 'border-green-500 bg-green-50' : 'border-slate-300 bg-white'}`}>
                                                <CardHeader className="p-4 border-b border-slate-200">
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle className="text-base font-semibold text-indigo-700 truncate flex-grow break-all" title={model.name}><Package size={16} className="inline mr-1.5 align-text-bottom" />{model.name}</CardTitle>
                                                        {model.is_active && (<span className="ml-2 text-xs bg-green-200 text-green-800 font-bold px-2.5 py-1 rounded-full flex items-center shrink-0 border border-green-400"><CheckCircle size={12} className="mr-1.5" />ACTIVE</span>)}
                                                    </div>
                                                    <CardDescription className="text-xs text-slate-500 mt-1.5 space-y-0.5">
                                                        <div className="flex items-center"><Clock size={12} className="inline mr-1.5" />Created: {format(new Date(model.created_at), "PPpp")}</div>
                                                        <div className="flex items-center"><FileText size={12} className="inline mr-1.5" />Size: {model.size_mb.toFixed(2)} MB</div>
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardFooter className="p-3 flex space-x-2">
                                                    <Button variant="default" size="sm" onClick={() => handleActivateModel(model.name)} disabled={model.is_active || (actionLoading.type === 'activate' && actionLoading.modelName === model.name) || (actionLoading.type === 'delete') || isRasaCmdLoading || isRasaActionsCmdLoading} className={`flex-1 text-xs min-w-0 ${ model.is_active ? 'bg-green-200 text-green-700 cursor-not-allowed hover:bg-green-200 focus-visible:ring-green-200' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                                                        {actionLoading.type === 'activate' && actionLoading.modelName === model.name ? <IconLoader size={14} className="mr-1.5 animate-spin" /> : <CheckCircle size={14} className="mr-1.5" />}
                                                        {model.is_active ? "Activated" : "Use Model"}
                                                    </Button>
                                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteModel(model.name)} disabled={(actionLoading.type === 'delete' && actionLoading.modelName === model.name) || (actionLoading.type === 'activate') || isRasaCmdLoading || isRasaActionsCmdLoading} className="flex-1 text-xs min-w-0">
                                                        {actionLoading.type === 'delete' && actionLoading.modelName === model.name ? <IconLoader size={14} className="mr-1.5 animate-spin" /> : <Trash2 size={14} className="mr-1.5" />}
                                                        Delete
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                        { !loading && models.length > 0 &&
                            <Alert variant="info" className="mt-8 border-blue-500 bg-blue-50 text-blue-700">
                                <AlertCircle className="h-4 w-4 text-blue-500" />
                                <AlertTitle className="text-blue-800 font-semibold">Model Activation & Rasa API</AlertTitle>
                                <AlertDescription className="text-blue-700">
                                    Activating a model prepares <code>{ACTIVE_MODEL_FILENAME_DISPLAY}</code>.
                                    If the Rasa API service is running with an older model, you must **Stop** and then **Start** it using the controls above for the new model to be loaded.
                                    The 'Start Rasa API' button always attempts to use the currently designated <code>{ACTIVE_MODEL_FILENAME_DISPLAY}</code>.
                                </AlertDescription>
                            </Alert>
                        }
                    </div>
                </div>
            </div>
            <AnimatePresence>
                {toast && <ToastNotification />}
            </AnimatePresence>
        </div>
    );
};

export default Models;