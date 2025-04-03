import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Send, ArrowRightToLine, Bot, User, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const Container = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef(null);

    // Color palette matching shadcn admin panel
    const colors = {
        background: "bg-gray-50",
        card: "bg-white",
        primary: "bg-gray-900",
        primaryText: "text-gray-900",
        secondary: "bg-gray-700",
        accent: "bg-blue-600",
        border: "border-gray-200",
        input: "bg-gray-100",
        botMessage: "bg-gray-100",
        userMessage: "bg-gray-800",
    };

    useEffect(() => {
        const initialGreeting = {
            text: "Hello! I'm your assistant. How can I help you today?",
            sender: "bot",
            id: Date.now(),
            isTyping: true,
        };

        setMessages([initialGreeting]);

        const timer = setTimeout(() => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === initialGreeting.id
                        ? { ...msg, isTyping: false }
                        : msg
                )
            );
        }, 1500);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (inputValue.trim() === "") return;

        const userMessage = {
            text: inputValue,
            sender: "user",
            id: Date.now(),
            isTyping: false,
        };
        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        const typingMessage = {
            text: "",
            sender: "bot",
            id: Date.now() + 1,
            isTyping: true,
        };
        setMessages((prev) => [...prev, typingMessage]);

        try {
            const response = await axios.post("http://localhost:5000/chat", {
                message: inputValue,
            });

            setMessages((prev) =>
                prev.filter((msg) => msg.id !== typingMessage.id)
            );

            if (response.data && Array.isArray(response.data)) {
                if (response.data.length === 0) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            text: "I'm not sure how to respond to that. Could you rephrase?",
                            sender: "bot",
                            id: Date.now() + 2,
                            isTyping: false,
                        },
                    ]);
                } else {
                    response.data.forEach((botMessage, index) => {
                        setTimeout(() => {
                            setMessages((prev) => [
                                ...prev,
                                {
                                    text:
                                        botMessage.text ||
                                        "I didn't understand that.",
                                    sender: "bot",
                                    id: Date.now() + 3 + index,
                                    isTyping: false,
                                },
                            ]);
                        }, index * 300);
                    });
                }
            } else {
                setMessages((prev) => [
                    ...prev,
                    {
                        text: "I encountered an issue processing your request.",
                        sender: "bot",
                        id: Date.now() + 4,
                        isTyping: false,
                    },
                ]);
            }
        } catch (error) {
            console.error("Error fetching bot response:", error);
            setMessages((prev) =>
                prev.filter((msg) => msg.id !== typingMessage.id)
            );

            setMessages((prev) => [
                ...prev,
                {
                    text: "Sorry, I'm having connection issues. Please try again later.",
                    sender: "bot",
                    id: Date.now() + 5,
                    isTyping: false,
                },
            ]);
            toast.error("Connection error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className={`flex flex-col items-center min-h-screen ${colors.background} p-4`}
        >
            <nav className="w-full max-w-3xl flex justify-end mb-2">
                <button
                    onClick={() => navigate("/admin")}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
                >
                    Admin Panel
                    <ArrowRightToLine className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </nav>

            <div
                className={`w-full max-w-3xl ${colors.card} rounded-lg shadow-sm border ${colors.border} overflow-hidden`}
            >
                <div
                    className={`p-4 border-b ${colors.border} flex items-center justify-between`}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-2 rounded-full ${colors.botMessage}`}
                        >
                            <Bot className="h-5 w-5 text-gray-700" />
                        </div>
                        <h1 className="text-lg font-medium text-gray-900">
                            CMAAA Assistant
                        </h1>
                    </div>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                </div>

                <div
                    ref={chatContainerRef}
                    className="h-[28rem] p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent space-y-3"
                >
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${
                                message.sender === "user"
                                    ? "justify-end"
                                    : "justify-start"
                            }`}
                        >
                            <div
                                className={`max-w-[85%] p-3 rounded-lg flex items-start gap-2 ${
                                    message.sender === "user"
                                        ? `${colors.userMessage} text-white rounded-br-none`
                                        : `${colors.botMessage} text-gray-800 rounded-bl-none`
                                } transition-all duration-200 ease-out`}
                            >
                                {message.sender === "bot" && (
                                    <Bot className="h-4 w-4 mt-1 flex-shrink-0 text-gray-500" />
                                )}
                                {message.sender === "user" && (
                                    <User className="h-4 w-4 mt-1 flex-shrink-0 text-gray-300" />
                                )}
                                <div className="flex-1">
                                    {message.isTyping ? (
                                        <div className="flex space-x-1 items-center h-6">
                                            <div
                                                className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                                                style={{
                                                    animationDelay: "0ms",
                                                }}
                                            />
                                            <div
                                                className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                                                style={{
                                                    animationDelay: "150ms",
                                                }}
                                            />
                                            <div
                                                className="h-2 w-2 rounded-full bg-gray-400 animate-bounce"
                                                style={{
                                                    animationDelay: "300ms",
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap">
                                            {message.text}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={`p-4 border-t ${colors.border} ${colors.card}`}>
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                className={`w-full ${colors.input} border ${colors.border} rounded-full pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent text-gray-900 placeholder-gray-400 transition-all`}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Type your message..."
                                disabled={isLoading}
                                autoFocus
                            />
                            {inputValue && (
                                <button
                                    type="button"
                                    onClick={() => setInputValue("")}
                                    className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <button
                            className={`${colors.primary} text-white rounded-full p-4 hover:${colors.secondary} transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
                            type="submit"
                            disabled={isLoading || inputValue.trim() === ""}
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Send className="h-5 w-5" />
                            )}
                        </button>
                    </form>
                    <p className="text-xs text-center text-gray-400 mt-2">
                        CMAAA Chatbot • Securely powered
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Container;
