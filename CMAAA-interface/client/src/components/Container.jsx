import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Container = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Ref for chat container
    const chatContainerRef = useRef(null);

    useEffect(() => {
        // Initial bot greeting
        setMessages([
            {
                text: "Hello! I'm the CMAAA Chatbot. How can I help you today?",
                sender: "bot",
                id: Date.now(),
            },
        ]);
    }, []);

    // Scroll to bottom whenever messages update
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (inputValue.trim() === "") return;

        const newMessage = { text: inputValue, sender: "user", id: Date.now() };
        setMessages((prev) => [...prev, newMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            const response = await axios.post("http://localhost:5000/chat", {
                message: inputValue,
            });

            // Handle Rasa response format
            if (response.data && Array.isArray(response.data)) {
                // Process each message from Rasa
                response.data.forEach((botMessage) => {
                    setMessages((prev) => [
                        ...prev,
                        {
                            text: botMessage.text || "No response",
                            sender: "bot",
                            id: Date.now() + Math.random(),
                        },
                    ]);
                });

                // If Rasa returned empty array, provide fallback
                if (response.data.length === 0) {
                    setMessages((prev) => [
                        ...prev,
                        {
                            text: "I'm not sure how to respond to that.",
                            sender: "bot",
                            id: Date.now() + 1,
                        },
                    ]);
                }
            } else {
                // Fallback for unexpected response format
                setMessages((prev) => [
                    ...prev,
                    {
                        text: "Received an unexpected response format.",
                        sender: "bot",
                        id: Date.now() + 1,
                    },
                ]);
            }
        } catch (error) {
            console.error("Error fetching bot response:", error);
            setMessages((prev) => [
                ...prev,
                {
                    text: "Sorry, I'm having trouble connecting to the server. Please try again later.",
                    sender: "bot",
                    id: Date.now() + 1,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-[#fefae0] p-4">
            <nav className="w-full max-w-2xl flex justify-end mb-2">
                <span
                    onClick={() => navigate("/admin")}
                    className="cursor-pointer hover:text-sky-700 font-bold"
                >
                    Admin Login
                </span>
            </nav>
            <div className="chat-container border border-[#d6ccc2]-600 rounded-xl w-full max-w-2xl bg-[#f5ebe0] shadow-lg">
                <div className="chat-header flex justify-center w-full border-b border-[#606c38]">
                    <h1 className="text-2xl py-4 text-[#283618]-700 font-semibold">
                        CMAAA Chatbot
                    </h1>
                </div>
                {/* Chat messages container with auto-scroll */}
                <div
                    ref={chatContainerRef}
                    className="chat-body flex flex-col gap-3 w-full h-96 p-4 overflow-y-auto"
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
                                className={`max-w-3/4 p-3 rounded-lg ${
                                    message.sender === "user"
                                        ? "bg-[#606c38] text-white rounded-br-none"
                                        : "bg-[#dda15e] text-black rounded-bl-none"
                                }`}
                            >
                                {message.text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-[#dda15e] text-black p-3 rounded-lg rounded-bl-none">
                                <span className="animate-pulse">
                                    Thinking...
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="chat-footer border-t border-[#606c38] p-4">
                    <form onSubmit={handleSubmit} className="flex gap-3">
                        <input
                            className="border border-gray-300 flex-1 rounded-full px-4 py-2 focus:outline-none focus:border-[#606c38]"
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Type your message..."
                            disabled={isLoading}
                        />
                        <button
                            className="bg-[#606c38] text-white rounded-full px-6 py-2 hover:bg-[#283618] cursor-pointer transition-colors disabled:bg-gray-400"
                            type="submit"
                            disabled={isLoading || inputValue.trim() === ""}
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Container;
