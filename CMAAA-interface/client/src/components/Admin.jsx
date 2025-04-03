import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
    AlertTriangle,
    Trash2,
    Edit,
    ChevronRight,
    Plus,
    X,
} from "lucide-react";
import { toast } from "sonner";

// Shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Admin = () => {
    const navigate = useNavigate();
    const [intents, setIntents] = useState([]);
    const [unclassifiedQueries, setUnclassifiedQueries] = useState([]);
    const [rules, setRules] = useState([]);

    // Intent management
    const [currentIntent, setCurrentIntent] = useState({
        intent_name: "",
        examples: [],
    });
    const [example, setExample] = useState("");
    const [editMode, setEditMode] = useState(false);

    // Rule management
    const [currentRule, setCurrentRule] = useState({
        intent: "",
        response: "",
    });
    const [editRuleMode, setEditRuleMode] = useState(false);

    // Common states
    const [loading, setLoading] = useState(false);
    const [selectedQuery, setSelectedQuery] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState({ type: "", id: "" });

    // Fetch data on component mount
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [intentsRes, queriesRes, rulesRes] = await Promise.all([
                    axios.get("http://localhost:5000/intents"),
                    axios.get("http://localhost:5000/unclassified-queries"),
                    axios.get("http://localhost:5000/rules"),
                ]);
                setIntents(intentsRes.data);
                setUnclassifiedQueries(queriesRes.data);
                setRules(rulesRes.data);
            } catch (error) {
                toast.error("Error fetching data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Intent management functions
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentIntent.intent_name.trim()) {
            toast.error("Intent name is required");
            return;
        }

        setLoading(true);
        try {
            await axios[editMode ? "put" : "post"](
                `http://localhost:5000/intents${
                    editMode ? `/${currentIntent._id}` : ""
                }`,
                currentIntent
            );
            const { data } = await axios.get("http://localhost:5000/intents");
            setIntents(data);
            resetForm();
            toast.success(
                `Intent ${editMode ? "updated" : "created"} successfully`
            );
        } catch (error) {
            toast.error("Error saving intent");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setCurrentIntent({ intent_name: "", examples: [] });
        setEditMode(false);
    };

    const handleDeleteIntent = async (id) => {
        setLoading(true);
        try {
            await axios.delete(`http://localhost:5000/intents/${id}`);
            setIntents(intents.filter((intent) => intent._id !== id));
            toast.success("Intent deleted successfully");
        } catch (error) {
            toast.error("Error deleting intent");
        } finally {
            setLoading(false);
            setDeleteDialogOpen(false);
        }
    };

    const handleAddExample = () => {
        if (!example.trim()) {
            toast.error("Example cannot be empty");
            return;
        }
        setCurrentIntent({
            ...currentIntent,
            examples: [...currentIntent.examples, example],
        });
        setExample("");
    };

    // Rule management functions
    const handleRuleSubmit = async (e) => {
        e.preventDefault();
        if (!currentRule.intent.trim() || !currentRule.response.trim()) {
            toast.error("Intent and response are required");
            return;
        }

        setLoading(true);
        try {
            const url = editRuleMode
                ? `http://localhost:5000/rules/${currentRule._id}`
                : "http://localhost:5000/rules";
            const method = editRuleMode ? "put" : "post";
            await axios[method](url, currentRule);

            const { data } = await axios.get("http://localhost:5000/rules");
            setRules(data);
            resetRuleForm();
            toast.success(
                `Rule ${editRuleMode ? "updated" : "created"} successfully`
            );
        } catch (error) {
            toast.error("Error saving rule");
        } finally {
            setLoading(false);
        }
    };

    const resetRuleForm = () => {
        setCurrentRule({ intent: "", response: "" });
        setEditRuleMode(false);
    };

    const handleDeleteRule = async (id) => {
        setLoading(true);
        try {
            await axios.delete(`http://localhost:5000/rules/${id}`);
            setRules(rules.filter((rule) => rule._id !== id));
            toast.success("Rule deleted successfully");
        } catch (error) {
            toast.error("Error deleting rule");
        } finally {
            setLoading(false);
            setDeleteDialogOpen(false);
        }
    };

    const handleEditRule = (rule) => {
        setCurrentRule(rule);
        setEditRuleMode(true);
    };

    // Query management functions
    const handleAddQueryToIntent = async () => {
        if (!selectedQuery || !currentIntent.intent_name) {
            toast.error("Please select both a query and an intent");
            return;
        }

        try {
            await axios.post(
                "http://localhost:5000/unclassified-queries/handle",
                {
                    queryId: selectedQuery._id,
                    intentName: currentIntent.intent_name,
                    example: selectedQuery.text,
                }
            );

            setUnclassifiedQueries(
                unclassifiedQueries.filter((q) => q._id !== selectedQuery._id)
            );
            const { data } = await axios.get("http://localhost:5000/intents");
            setIntents(data);
            setSelectedQuery(null);
            resetForm();
            toast.success("Query added to intent successfully");
        } catch (error) {
            toast.error("Error adding query to intent");
        }
    };

    const handleDeleteQuery = async (queryId) => {
        setLoading(true);
        try {
            await axios.delete(
                `http://localhost:5000/unclassified-queries/${queryId}`
            );
            setUnclassifiedQueries(
                unclassifiedQueries.filter((q) => q._id !== queryId)
            );
            if (selectedQuery && selectedQuery._id === queryId) {
                setSelectedQuery(null);
            }
            toast.success("Query deleted successfully");
        } catch (error) {
            toast.error("Error deleting query");
        } finally {
            setLoading(false);
            setDeleteDialogOpen(false);
        }
    };

    // Common functions
    const confirmDelete = (type, id) => {
        setItemToDelete({ type, id });
        setDeleteDialogOpen(true);
    };

    const executeDelete = () => {
        switch (itemToDelete.type) {
            case "intent":
                handleDeleteIntent(itemToDelete.id);
                break;
            case "rule":
                handleDeleteRule(itemToDelete.id);
                break;
            case "query":
                handleDeleteQuery(itemToDelete.id);
                break;
            default:
                break;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="container mx-auto max-w-6xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Admin Dashboard
                    </h1>
                    <Button onClick={() => navigate("/")} variant="outline">
                        <ChevronRight className="mr-2 h-4 w-4" />
                        Back to Chat
                    </Button>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="intents" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="intents">Intents</TabsTrigger>
                        <TabsTrigger value="rules">Rules</TabsTrigger>
                        <TabsTrigger value="queries">
                            Unclassified Queries
                        </TabsTrigger>
                    </TabsList>

                    {/* Intents Tab */}
                    <TabsContent value="intents" className="space-y-4">
                        {/* Intent Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {editMode
                                        ? "Edit Intent"
                                        : "Create New Intent"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-4"
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="intent-name">
                                            Intent Name
                                        </Label>
                                        <Input
                                            id="intent-name"
                                            value={currentIntent.intent_name}
                                            onChange={(e) =>
                                                setCurrentIntent({
                                                    ...currentIntent,
                                                    intent_name: e.target.value,
                                                })
                                            }
                                            placeholder="e.g., greet, goodbye, thank_you"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="example">
                                            Examples
                                        </Label>
                                        <div className="flex space-x-2">
                                            <Input
                                                id="example"
                                                value={example}
                                                onChange={(e) =>
                                                    setExample(e.target.value)
                                                }
                                                placeholder="Add an example phrase"
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleAddExample}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Add
                                            </Button>
                                        </div>

                                        {currentIntent.examples.length > 0 && (
                                            <div className="border rounded-lg p-3">
                                                <ul className="space-y-1">
                                                    {currentIntent.examples.map(
                                                        (ex, index) => (
                                                            <li
                                                                key={index}
                                                                className="flex justify-between items-center"
                                                            >
                                                                <span>
                                                                    {ex}
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        const newExamples =
                                                                            [
                                                                                ...currentIntent.examples,
                                                                            ];
                                                                        newExamples.splice(
                                                                            index,
                                                                            1
                                                                        );
                                                                        setCurrentIntent(
                                                                            {
                                                                                ...currentIntent,
                                                                                examples:
                                                                                    newExamples,
                                                                            }
                                                                        );
                                                                    }}
                                                                >
                                                                    <X className="h-4 w-4 text-red-500" />
                                                                </Button>
                                                            </li>
                                                        )
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end space-x-2">
                                        {editMode && (
                                            <Button
                                                type="button"
                                                onClick={resetForm}
                                                variant="outline"
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                        >
                                            {loading
                                                ? "Saving..."
                                                : editMode
                                                ? "Update Intent"
                                                : "Create Intent"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Existing Intents */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Existing Intents</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading && (
                                    <p className="text-gray-500">Loading...</p>
                                )}

                                {intents.length === 0 && !loading ? (
                                    <p className="text-gray-500">
                                        No intents found. Create your first one!
                                    </p>
                                ) : (
                                    <ScrollArea className="h-[400px] rounded-md border">
                                        <div className="space-y-2 p-2">
                                            {intents.map((intent) => (
                                                <div
                                                    key={intent._id}
                                                    className="p-4 border rounded-lg"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <h3 className="font-medium">
                                                                {
                                                                    intent.intent_name
                                                                }
                                                            </h3>
                                                            <div className="flex items-center space-x-2 mt-1">
                                                                <Badge variant="outline">
                                                                    {
                                                                        intent
                                                                            .examples
                                                                            .length
                                                                    }{" "}
                                                                    example
                                                                    {intent
                                                                        .examples
                                                                        .length !==
                                                                    1
                                                                        ? "s"
                                                                        : ""}
                                                                </Badge>
                                                                {intent.examples
                                                                    .length >
                                                                    0 && (
                                                                    <p className="text-sm text-gray-600 truncate">
                                                                        "
                                                                        {
                                                                            intent
                                                                                .examples[0]
                                                                        }
                                                                        "
                                                                        {intent
                                                                            .examples
                                                                            .length >
                                                                            1 &&
                                                                            " and more..."}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setCurrentIntent(
                                                                        intent
                                                                    );
                                                                    setEditMode(
                                                                        true
                                                                    );
                                                                }}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    confirmDelete(
                                                                        "intent",
                                                                        intent._id
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Rules Tab */}
                    <TabsContent value="rules" className="space-y-4">
                        {/* Rule Form */}
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {editRuleMode
                                        ? "Edit Rule"
                                        : "Create New Rule"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form
                                    onSubmit={handleRuleSubmit}
                                    className="space-y-4"
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="intent">Intent</Label>
                                        <Input
                                            id="intent"
                                            value={currentRule.intent}
                                            onChange={(e) =>
                                                setCurrentRule({
                                                    ...currentRule,
                                                    intent: e.target.value,
                                                })
                                            }
                                            placeholder="e.g., greet, goodbye"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="response">
                                            Response
                                        </Label>
                                        <Input
                                            id="response"
                                            value={currentRule.response}
                                            onChange={(e) =>
                                                setCurrentRule({
                                                    ...currentRule,
                                                    response: e.target.value,
                                                })
                                            }
                                            placeholder="e.g., Hello, Goodbye"
                                        />
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                        {editRuleMode && (
                                            <Button
                                                type="button"
                                                onClick={resetRuleForm}
                                                variant="outline"
                                            >
                                                Cancel
                                            </Button>
                                        )}
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                        >
                                            {loading
                                                ? "Saving..."
                                                : editRuleMode
                                                ? "Update Rule"
                                                : "Create Rule"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Existing Rules */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Existing Rules</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loading && (
                                    <p className="text-gray-500">Loading...</p>
                                )}

                                {rules.length === 0 && !loading ? (
                                    <p className="text-gray-500">
                                        No rules found. Create your first one!
                                    </p>
                                ) : (
                                    <ScrollArea className="h-[400px] rounded-md border">
                                        <div className="space-y-2 p-2">
                                            {rules.map((rule) => (
                                                <div
                                                    key={rule._id}
                                                    className="p-4 border rounded-lg"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <h3 className="font-medium">
                                                                {rule.intent}
                                                            </h3>
                                                            <p className="text-sm text-gray-600">
                                                                Response:{" "}
                                                                {rule.response}
                                                            </p>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleEditRule(
                                                                        rule
                                                                    )
                                                                }
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() =>
                                                                    confirmDelete(
                                                                        "rule",
                                                                        rule._id
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="h-4 w-4 text-red-500" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Queries Tab */}
                    <TabsContent value="queries">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />
                                    Unclassified Queries
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {unclassifiedQueries.length === 0 ? (
                                    <p className="text-gray-600">
                                        No unclassified queries found.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {unclassifiedQueries.map((query) => (
                                            <div
                                                key={query._id}
                                                className={`p-3 rounded-md ${
                                                    selectedQuery?._id ===
                                                    query._id
                                                        ? "bg-blue-50 border border-blue-200"
                                                        : "bg-gray-50"
                                                } cursor-pointer hover:bg-gray-100 transition-colors`}
                                                onClick={() =>
                                                    setSelectedQuery(query)
                                                }
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <p className="text-gray-800">
                                                            {query.text}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {new Date(
                                                                query.date
                                                            ).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            confirmDelete(
                                                                "query",
                                                                query._id
                                                            );
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {selectedQuery && (
                                    <div className="mt-4">
                                        <Separator className="my-4" />
                                        <h3 className="font-medium mb-2">
                                            Add to Intent
                                        </h3>
                                        <div className="flex space-x-2">
                                            <Select
                                                value={
                                                    currentIntent.intent_name
                                                }
                                                onValueChange={(value) =>
                                                    setCurrentIntent({
                                                        ...currentIntent,
                                                        intent_name: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select Intent" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {intents.map((intent) => (
                                                        <SelectItem
                                                            key={intent._id}
                                                            value={
                                                                intent.intent_name
                                                            }
                                                        >
                                                            {intent.intent_name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                onClick={handleAddQueryToIntent}
                                                disabled={
                                                    !currentIntent.intent_name
                                                }
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Delete Confirmation Dialog */}
                <AlertDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Are you absolutely sure?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the {itemToDelete.type}.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={executeDelete}>
                                Continue
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    );
};

export default Admin;
