// src/components/Chatbot.jsx (Improved UI with Better Focus Management)

import { useState, useEffect, useRef } from "react";
import { Send, X, MessageSquare, User } from "lucide-react"; // Import icons

// Add 'onClose' prop for a potential close button inside the chatbot
function Chatbot({ onClose }) {
    const [message, setMessage] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [senderId, setSenderId] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const chatMessagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const welcomeMessageShown = useRef(false);

    // Function to focus input with a slight delay to ensure DOM is ready
    const focusInput = () => {
        setTimeout(() => {
            if (inputRef.current && !inputRef.current.disabled) {
                inputRef.current.focus();
            }
        }, 100);
    };

    useEffect(() => {
        let currentSenderId = localStorage.getItem("chatbotSenderId");

        if (!currentSenderId) {
            currentSenderId = `web_user_${Math.random()
                .toString(36)
                .substring(2, 15)}`;
            localStorage.setItem("chatbotSenderId", currentSenderId);
        }
        setSenderId(currentSenderId);

        if (!welcomeMessageShown.current) {
            welcomeMessageShown.current = true;

            const welcomeMessages = [
                "Hi! Nice to see you. How's your day going?",
                "Hello there! Welcome to our chatbot. How can I help you today?",
                "Welcome! I'm here to assist you. What brings you here?",
                "Hey! Thanks for stopping by. What can I do for you?",
                "Greetings! How may I assist you today?"
            ];

            const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
            const randomWelcomeMessage = welcomeMessages[randomIndex];

            setTimeout(() => {
                const welcomeMessageOutput = {
                    text: randomWelcomeMessage,
                    sender: "bot",
                    type: "text"
                };
                setChatHistory([welcomeMessageOutput]);
                // Focus input after welcome message is shown
                focusInput();
            }, 500);
        }

        // Focus input when chatbot first opens
        focusInput();
    }, []);

    useEffect(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    const handleInputChange = (event) => {
        setMessage(event.target.value);
    };

    const sendPayloadToRasa = async (payload, displayText, currentSenderId) => {
        if (!payload || (!payload.trim() && !displayText)) return;

        const idToUse = currentSenderId || senderId;

        if (displayText) {
            const userMessageEntry = {
                text: displayText,
                sender: "user",
                type: "text",
            };
            setChatHistory((prevHistory) => [...prevHistory, userMessageEntry]);
        }

        setIsLoading(true);
        if (payload === message) {
            setMessage("");
        }

        try {
            const backendUrl = "http://localhost:5000/chat";
            const response = await fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: payload, sender: idToUse }),
            });

            if (!response.ok) {
                let errorData;
                try { errorData = await response.json(); }
                catch (e) { errorData = [{ text: `Error: ${response.statusText || "Server connection issue"}` }]; }
                
                const errorMessages = (Array.isArray(errorData) ? errorData : [{ text: errorData.message || errorData.detail || "An unknown error occurred." }])
                    .map((err) => ({
                        text: err.text || "An unknown error occurred.", sender: "bot", type: "error",
                    }));
                setChatHistory((prevHistory) => [...prevHistory, ...errorMessages]);
                return;
            }

            const rasaResponseData = await response.json();
            const botMessages = rasaResponseData.map((resItem) => ({
                text: resItem.text, image: resItem.image, buttons: resItem.buttons, sender: "bot",
                type: resItem.image ? "image" : resItem.buttons ? "buttons" : "text",
            }));
            setChatHistory((prevHistory) => [...prevHistory, ...botMessages]);
        } catch (error) {
            console.error("Failed to send message to backend:", error);
            const networkErrorMessage = {
                text: "Sorry, I'm having trouble connecting. Please check your internet or try again later.",
                sender: "bot", type: "error",
            };
            setChatHistory((prevHistory) => [...prevHistory, networkErrorMessage]);
        } finally {
            setIsLoading(false);
            // Focus input after response is received and loading is complete
            focusInput();
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!message.trim() || !senderId) return;

        sendPayloadToRasa(message, message, senderId);
    };

    const handleRasaButtonClick = (buttonPayload, buttonTitle) => {
        if (!senderId) return;
        sendPayloadToRasa(buttonPayload, buttonTitle, senderId);
    };

    const BotTypingIndicator = () => (
        <div className="flex items-center space-x-1 p-2">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
        </div>
    );

    return (
        <div className="w-full min-w-[360px] max-w-md bg-white shadow-2xl rounded-xl flex flex-col h-[70vh] min-h-[450px] max-h-[700px] font-sans border border-slate-200">
            <header className="bg-slate-800 text-white p-4 rounded-t-xl flex justify-between items-center shadow-md">
                <div className="flex items-center">
                    <MessageSquare size={24} className="mr-3" />
                    <h1 className="text-lg font-semibold">
                        Support Chat
                    </h1>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-slate-300 hover:text-white p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
                        aria-label="Close chat"
                    >
                        <X size={20} />
                    </button>
                )}
            </header>

            <main className="flex-grow p-4 space-y-3 overflow-y-auto bg-slate-50 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                {chatHistory.map((chatItem, index) => (
                    <div
                        key={index}
                        className={`flex items-end gap-2 ${chatItem.sender === "user" ? "justify-end" : "justify-start"
                            }`}
                    >
                        {chatItem.sender === "bot" && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white mb-1">
                                <MessageSquare size={16} />
                            </div>
                        )}
                        <div
                            className={`max-w-[70%] lg:max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm ${chatItem.sender === "user"
                                ? "bg-blue-600 text-white rounded-br-none"
                                : `bg-white text-slate-800 border border-slate-200 rounded-bl-none ${chatItem.type === "error" ? "bg-red-50 border-red-300 text-red-700" : ""}`
                                }`}
                        >
                            {chatItem.text && (
                                <p className={`text-sm whitespace-pre-wrap break-words ${chatItem.type === "error" ? "font-medium" : ""}`}>{chatItem.text}</p>
                            )}
                            {chatItem.type === "image" && chatItem.image && (
                                <img
                                    src={chatItem.image} alt="Bot content"
                                    className="mt-2 rounded-lg max-w-full h-auto shadow"
                                    onError={(e) => { e.target.style.display = "none"; }}
                                />
                            )}
                            {chatItem.type === "buttons" && chatItem.buttons && chatItem.buttons.length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                    {chatItem.buttons.map((button, btnIndex) => (
                                        <button
                                            key={btnIndex}
                                            onClick={() => handleRasaButtonClick(button.payload, button.title)}
                                            disabled={isLoading}
                                            className="bg-blue-50 text-blue-700 border border-blue-300 px-3.5 py-1.5 rounded-full text-xs font-medium hover:bg-blue-100 hover:border-blue-400 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {button.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {chatItem.sender === "user" && (
                             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white mb-1">
                                <User size={16} />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start items-end gap-2">
                         <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white mb-1">
                            <MessageSquare size={16} />
                        </div>
                        <div className="px-4 py-2.5 rounded-2xl shadow-sm bg-white text-slate-600 text-sm italic border border-slate-200 rounded-bl-none">
                            <BotTypingIndicator />
                        </div>
                    </div>
                )}
                <div ref={chatMessagesEndRef} />
            </main>

            <footer className="bg-white p-3 border-t border-slate-200 rounded-b-xl shadow-sm">
                <form
                    onSubmit={handleSubmit}
                    className="flex items-center gap-2.5"
                >
                    <input
                        ref={inputRef} type="text" value={message} onChange={handleInputChange}
                        placeholder="Type a message..." aria-label="Chat message input"
                        disabled={isLoading || !senderId}
                        className="flex-grow p-3 border border-slate-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-150 text-sm placeholder-slate-400"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !message.trim() || !senderId}
                        className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                        aria-label="Send message"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </footer>
        </div>
    );
}

export default Chatbot;