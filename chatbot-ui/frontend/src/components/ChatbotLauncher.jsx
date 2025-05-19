// src/components/ChatbotLauncher.jsx
import React, { useState } from "react";
import Lottie from "lottie-react";
import Chatbot from "./chatbot"; // Assuming your chatbot component file is named chatbot.jsx
import robotAnimation from "../robot.json"; // Assuming robot.json is in the parent directory of components (e.g., src/robot.json)

// Removed unused robotAnimationData prop from the function signature
function ChatbotLauncher() {
    const [isChatbotOpen, setIsChatbotOpen] = useState(false);

    const toggleChatbot = () => {
        setIsChatbotOpen(!isChatbotOpen);
    };

    return (
        <>
            {/* Lottie Animation Button */}
            <div
                style={{
                    position: "fixed",
                    bottom: "20px",
                    right: "20px",
                    zIndex: 1050,
                    cursor: "pointer",
                }}
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
                    style={{ height: 100, width: 100 }}
                    loop
                />
            </div>

            {/* Chatbot Component Container - Conditionally Rendered with Transition */}
            <div
                className={`fixed bottom-[130px] right-[20px] z-[1000] 
                            transition-all duration-300 ease-in-out 
                            ${ // Updated animation classes
                                isChatbotOpen
                                    ? "opacity-100 translate-y-0"
                                    : "opacity-0 translate-y-5 pointer-events-none" // Softer slide and fade, no scale
                            }`}
            >
                {isChatbotOpen && <Chatbot onClose={toggleChatbot} />}
            </div>
        </>
    );
}

export default ChatbotLauncher;