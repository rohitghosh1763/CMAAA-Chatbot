import React, { useState, useEffect, useRef } from "react";
import "./App.css";
// Main App component
function App() {
    // State for the current message being typed by the user
    const [message, setMessage] = useState("");
    // State for the history of chat messages
    const [chatHistory, setChatHistory] = useState([]);
    // State for the unique sender ID for the current user session
    const [senderId, setSenderId] = useState("");
    // State to indicate if the bot is currently processing a message
    const [isLoading, setIsLoading] = useState(false);

    // Ref to the chat messages container for auto-scrolling
    const chatMessagesEndRef = useRef(null);
    // Ref to the input field for focusing
    const inputRef = useRef(null);

    // Effect hook to initialize the senderId
    // This runs once when the component mounts
    useEffect(() => {
        let currentSenderId = localStorage.getItem("chatbotSenderId");
        if (!currentSenderId) {
            // Generate a simple unique ID if one doesn't exist
            currentSenderId = `web_user_${Math.random()
                .toString(36)
                .substring(2, 15)}`;
            localStorage.setItem("chatbotSenderId", currentSenderId);
        }
        setSenderId(currentSenderId);

        // Optional: Send an initial event to Rasa when the chat loads, e.g., to trigger a welcome message.
        // Make sure your Rasa bot is configured to handle an event like '/session_start'
        // or an initial user message like "hello".
        // Example: sendPayloadToRasa('/session_start', null, currentSenderId); // 'null' for displayText if no user text needed
    }, []); // Empty dependency array ensures this runs only once on mount

    // Effect hook to scroll to the bottom of the chat messages when new messages are added
    useEffect(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]); // Runs whenever chatHistory changes

    // Function to handle changes in the message input field
    const handleInputChange = (event) => {
        setMessage(event.target.value);
    };

    // Core function to send a message/payload to the Rasa backend via your Express proxy
    const sendPayloadToRasa = async (payload, displayText, currentSenderId) => {
        // Do not send if payload is empty (unless it's an event like /session_start)
        if (!payload || (!payload.trim() && !displayText)) return;

        const idToUse = currentSenderId || senderId; // Use passed senderId or state

        // If displayText is provided, it means this is a user-initiated message (typed or button click)
        // Add this message to the chat history immediately for a responsive UI
        if (displayText) {
            const userMessageEntry = {
                text: displayText,
                sender: "user",
                type: "text",
            };
            setChatHistory((prevHistory) => [...prevHistory, userMessageEntry]);
        }

        setIsLoading(true); // Show loading indicator

        // Clear the input field if the payload was the typed message
        if (payload === message) {
            setMessage("");
        }

        try {
            // --- IMPORTANT ---
            // The URL for your Express backend.
            // Replace 'http://localhost:5000/chat' if your backend is running elsewhere.
            const backendUrl = "http://localhost:5000/chat";

            const response = await fetch(backendUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: payload, // This is the actual message/payload for Rasa
                    sender: idToUse, // The unique ID for the user session
                }),
            });

            if (!response.ok) {
                // Attempt to parse error from backend if available (backend sends array of message objects)
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    // If parsing fails, create a generic error message object
                    errorData = [
                        {
                            text: `Error: ${
                                response.statusText || "Server connection issue"
                            }`,
                        },
                    ];
                }
                // Map backend error structure to chat message structure
                const errorMessages = errorData.map((err) => ({
                    text: err.text || "An unknown error occurred.",
                    sender: "bot",
                    type: "error",
                }));
                setChatHistory((prevHistory) => [
                    ...prevHistory,
                    ...errorMessages,
                ]);
                return; // Exit after handling error
            }

            // Rasa typically returns an array of message objects
            const rasaResponseData = await response.json();

            // Process Rasa's response(s) and add them to chat history
            const botMessages = rasaResponseData.map((resItem) => ({
                text: resItem.text,
                image: resItem.image, // For image responses
                buttons: resItem.buttons, // For interactive buttons [{title: "Yes", payload: "/affirm"}, ...]
                sender: "bot",
                type: resItem.image
                    ? "image"
                    : resItem.buttons
                    ? "buttons"
                    : "text", // Determine message type
            }));
            setChatHistory((prevHistory) => [...prevHistory, ...botMessages]);
        } catch (error) {
            console.error("Failed to send message to backend:", error);
            // Display a generic error message in the chat if communication fails
            const networkErrorMessage = {
                text: "Sorry, I'm having trouble connecting. Please check your internet connection or try again later.",
                sender: "bot",
                type: "error",
            };
            setChatHistory((prevHistory) => [
                ...prevHistory,
                networkErrorMessage,
            ]);
        } finally {
            setIsLoading(false); // Hide loading indicator
            inputRef.current?.focus(); // Re-focus the input field
        }
    };

    // Function to handle the submission of the chat form (when user presses Enter or clicks Send)
    const handleSubmit = (event) => {
        event.preventDefault(); // Prevent default form submission
        if (!message.trim() || !senderId) return; // Don't send empty messages or if senderId is not set
        sendPayloadToRasa(message, message, senderId); // Send typed message, display it as user message
    };

    // Function to handle clicks on Rasa's quick reply buttons
    const handleRasaButtonClick = (buttonPayload, buttonTitle) => {
        if (!senderId) return;
        // Send the button's payload to Rasa, and display the button's title as the user's message
        sendPayloadToRasa(buttonPayload, buttonTitle, senderId);
    };

    // Render the Chatbot UI
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans p-4">
            <div className="w-full max-w-md bg-white shadow-xl rounded-lg flex flex-col h-[85vh]">
                {/* Chatbot Header */}
                <header className="bg-blue-600 text-white p-4 rounded-t-lg">
                    <h1 className="text-xl font-semibold text-center">
                        Rasa ChatBot
                    </h1>
                </header>

                {/* Chat Messages Area */}
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
                                {/* Display text message */}
                                {chatItem.text && (
                                    <p className="text-sm">{chatItem.text}</p>
                                )}

                                {/* Display image if available */}
                                {chatItem.type === "image" &&
                                    chatItem.image && (
                                        <img
                                            src={chatItem.image}
                                            alt="Bot content"
                                            className="mt-2 rounded-lg max-w-full h-auto"
                                            onError={(e) => {
                                                e.target.style.display =
                                                    "none"; /* Hide if image fails to load */
                                            }}
                                        />
                                    )}

                                {/* Display buttons if available */}
                                {chatItem.type === "buttons" &&
                                    chatItem.buttons &&
                                    chatItem.buttons.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {chatItem.buttons.map(
                                                (button, btnIndex) => (
                                                    <button
                                                        key={btnIndex}
                                                        onClick={() =>
                                                            handleRasaButtonClick(
                                                                button.payload,
                                                                button.title
                                                            )
                                                        }
                                                        disabled={isLoading}
                                                        className="bg-white text-blue-600 border border-blue-600 px-3 py-1 rounded-full text-sm hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {button.title}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    )}
                                {/* Display error type message */}
                                {chatItem.type === "error" && chatItem.text && (
                                    <p className="text-sm text-red-600 font-medium">
                                        {chatItem.text}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                    {/* Typing indicator */}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="px-4 py-2 rounded-lg bg-gray-200 text-gray-600 text-sm italic shadow rounded-bl-none">
                                Bot is typing...
                            </div>
                        </div>
                    )}
                    {/* Element to scroll to */}
                    <div ref={chatMessagesEndRef} />
                </main>

                {/* Input Form Area */}
                <footer className="bg-gray-100 p-3 border-t border-gray-300 rounded-b-lg">
                    <form
                        onSubmit={handleSubmit}
                        className="flex items-center gap-2"
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={message}
                            onChange={handleInputChange}
                            placeholder="Type your message..."
                            aria-label="Chat message input"
                            disabled={isLoading || !senderId} // Disable if loading or senderId not yet set
                            className="flex-grow p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !message.trim() || !senderId}
                            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Send message"
                        >
                            {/* Send Icon SVG */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-5 h-5"
                            >
                                <path d="M3.105 3.105a1.5 1.5 0 012.122-.001L19.21 11.143a1.5 1.5 0 010 2.121L5.227 19.254a1.5 1.5 0 01-2.122-.001l-.002-.001a1.5 1.5 0 01.002-2.121L14.88 12.5H5.25a.75.75 0 010-1.5h9.63L3.105 5.227a1.5 1.5 0 010-2.122z" />
                            </svg>
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
}

export default App;
