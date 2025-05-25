import React from "react";
import ChatbotLauncher from "./components/ChatbotLauncher"; // Adjust path - Ensure this component exists
import robotAnimation from "./robot.json"; // IMPORTANT: Ensure this Lottie JSON file exists at this path
import "./App.css"; // Ensure Tailwind CSS is imported globally or your global styles are here

// The image nic.jpg is expected to be in the public folder (e.g., public/nic.jpg)
const nicImageUrl = "/nic.svg"; // Path relative to the public folder

function App() {
    return (
        <div
            className="relative min-h-screen" // Tailwind classes for layout
            style={{
                backgroundImage: `url("${nicImageUrl}")`,
                backgroundSize: "cover",      // Ensures the image covers the whole div
                backgroundPosition: "center", // Centers the image
                backgroundRepeat: "no-repeat", // Prevents the image from repeating
            }}
        >
            {/* All previous text content and SVG background logic has been removed. */}
            {/* The background is now set to nic.jpg from the public folder. */}

            {/* Chatbot Launcher remains positioned at the bottom right */}
            <ChatbotLauncher robotAnimationData={robotAnimation} />
        </div>
    );
}

export default App;