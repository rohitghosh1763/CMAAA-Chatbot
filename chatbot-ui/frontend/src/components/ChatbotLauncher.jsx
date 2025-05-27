import React, { useState, useEffect, useRef } from "react";
import Lottie from "lottie-react";
import Chatbot from "./chatbot"; // Assuming your chatbot component file is named chatbot.jsx
import robotAnimation from "../robot.json"; // Ensure this path is correct

function ChatbotLauncher() {
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);
    const launcherRef = useRef(null);
    const chatbotContainerRef = useRef(null);

    const toggleChatbot = () => {
        setIsChatbotOpen(!isChatbotOpen);
    };

    // Effect for handling clicks outside the chatbot to close it
    useEffect(() => {
        function handleClickOutside(event) {
            if (isChatbotOpen &&
                launcherRef.current && !launcherRef.current.contains(event.target) &&
                chatbotContainerRef.current && !chatbotContainerRef.current.contains(event.target)
            ) {
                setIsChatbotOpen(false);
            }
        }

        if (isChatbotOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isChatbotOpen]);


    return (
        <>
            {/* Lottie Animation Button */}
            <div
                ref={launcherRef}
                className="fixed bottom-5 right-5 z-50 cursor-pointer p-2 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={toggleChatbot}
                aria-label={isChatbotOpen ? "Close Chatbot" : "Open Chatbot"}
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                    if (e.key === "Enter" || e.key === " ") toggleChatbot();
                }}
            >
                <Lottie
                    animationData={robotAnimation}
                    style={{ height: 60, width: 60 }} // Slightly smaller for a sleeker button
                    loop
                />
            </div>

            {/* Chatbot Component Container */}
            {/* Always rendered, visibility controlled by CSS for state persistence */}
            <div
                ref={chatbotContainerRef}
                className={`fixed right-5 z-[1000] 
                            transition-all duration-300 ease-in-out
                            ${isChatbotOpen
                                ? "opacity-100 translate-y-0 bottom-[calc(20px+60px+20px)]" // Launcher bottom + launcher height (60px from Lottie) + 20px gap
                                : "opacity-0 translate-y-5 pointer-events-none bottom-[calc(20px+60px+20px)]" // Start slightly lower for slide-up, ensure it's not interactive when hidden
                            }`}
            >
                <Chatbot onClose={() => setIsChatbotOpen(false)} />
            </div>
        </>
    );
}

export default ChatbotLauncher;