// src/components/Chatbot.jsx (Modified)
import { useState, useEffect, useRef } from "react";

// Add 'onClose' prop for a potential close button inside the chatbot
function Chatbot({ onClose }) { 
    const [message, setMessage] = useState("");
    const [chatHistory, setChatHistory] = useState([]);
    const [senderId, setSenderId] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const chatMessagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const welcomeMessageShown = useRef(false);

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
                const welcomeMessageOutput = { // Renamed to avoid conflict with global 'message'
                    text: randomWelcomeMessage,
                    sender: "bot",
                    type: "text"
                };
                setChatHistory([welcomeMessageOutput]);
            }, 500);
        }

        // Focus the input field when the chatbot mounts (becomes visible)
        if (inputRef.current) {
            setTimeout(() => { // Timeout helps ensure focus after transitions
                inputRef.current.focus();
            }, 100); 
        }

    }, []); // Empty dependency array ensures this runs once on mount

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
        if (payload === message) { // Check against component's message state
            setMessage("");
        }
        try {
            const backendUrl = "http://localhost:5000/chat"; // Ensure your backend is running
            const response = await fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: payload, sender: idToUse }), // 'message' here refers to the payload
            });
            if (!response.ok) {
                let errorData;
                try { errorData = await response.json(); } 
                catch (e) { errorData = [{ text: `Error: ${response.statusText || "Server connection issue"}` }]; }
                const errorMessages = errorData.map((err) => ({
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
            inputRef.current?.focus();
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!message.trim() || !senderId) return; // Check against component's message state
        sendPayloadToRasa(message, message, senderId); // Pass component's message state
    };

    const handleRasaButtonClick = (buttonPayload, buttonTitle) => {
        if (!senderId) return;
        sendPayloadToRasa(buttonPayload, buttonTitle, senderId);
    };

    return (
        <div className="w-full min-w-[360px] max-w-lg bg-white shadow-xl rounded-lg flex flex-col h-[60vh] font-sans"> {/* MODIFIED LINE */}
            <header className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
                <h1 className="text-xl font-semibold text-center">
                    Rasa ChatBot
                </h1>
                {onClose && (
                     <button 
                        onClick={onClose} 
                        className="text-white hover:text-gray-200 p-1"
                        aria-label="Close chat"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                )}
            </header>

            <main className="flex-grow p-4 space-y-4 overflow-y-auto bg-gray-50">
                {chatHistory.map((chatItem, index) => (
                    <div
                        key={index}
                        className={`flex ${
                            chatItem.sender === "user"
                                ? "justify-end"
                                : "justify-start"
                        }`}
                    >
                        <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl shadow ${
                                chatItem.sender === "user"
                                    ? "bg-blue-500 text-white rounded-br-none"
                                    : "bg-gray-200 text-gray-800 rounded-bl-none"
                            }`}
                        >
                            {chatItem.text && (
                                <p className="text-sm whitespace-pre-wrap break-words">{chatItem.text}</p>
                            )}
                            {chatItem.type === "image" && chatItem.image && (
                                <img
                                    src={chatItem.image} alt="Bot content"
                                    className="mt-2 rounded-lg max-w-full h-auto"
                                    onError={(e) => { e.target.style.display = "none"; }}
                                />
                            )}
                            {chatItem.type === "buttons" && chatItem.buttons && chatItem.buttons.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {chatItem.buttons.map((button, btnIndex) => (
                                        <button
                                            key={btnIndex}
                                            onClick={() => handleRasaButtonClick(button.payload, button.title)}
                                            disabled={isLoading}
                                            className="bg-white text-blue-600 border border-blue-600 px-3 py-1 rounded-full text-sm hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {button.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {chatItem.type === "error" && chatItem.text && (
                                <p className="text-sm text-red-600 font-medium">{chatItem.text}</p>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="px-4 py-2 rounded-lg bg-gray-200 text-gray-600 text-sm italic shadow rounded-bl-none">
                            Bot is typing...
                        </div>
                    </div>
                )}
                <div ref={chatMessagesEndRef} />
            </main>

            <footer className="bg-gray-100 p-3 border-t border-gray-300 rounded-b-lg">
                <form
                    onSubmit={handleSubmit}
                    className="flex items-center gap-2"
                >
                    <input
                        ref={inputRef} type="text" value={message} onChange={handleInputChange}
                        placeholder="Type your message..." aria-label="Chat message input"
                        disabled={isLoading || !senderId}
                        className="flex-grow p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !message.trim() || !senderId}
                        className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Send message"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path d="M3.105 3.105a1.5 1.5 0 012.122-.001L19.21 11.143a1.5 1.5 0 010 2.121L5.227 19.254a1.5 1.5 0 01-2.122-.001l-.002-.001a1.5 1.5 0 01.002-2.121L14.88 12.5H5.25a.75.75 0 010-1.5h9.63L3.105 5.227a1.5 1.5 0 010-2.122z" />
                        </svg>
                    </button>
                </form>
            </footer>
        </div>
    );
}

export default Chatbot;