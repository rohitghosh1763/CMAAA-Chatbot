// // App.js or App.tsx
// import Chatbot from "./components/chatbot";
// import "./App.css";
// import Lottie from "lottie-react";
// import robotAnimation from "./robot.json";

// function App() {
//     return (
//         <div>
//             <Chatbot />
//             <div
//                 style={{
//                     position: "fixed",
//                     bottom: "20px",
//                     right: "20px",
//                     zIndex: 1000,
//                 }}
//             >
//                 <Lottie
//                     animationData={robotAnimation}
//                     style={{ height: 100 }}
//                     loop
//                 />
//             </div>
//         </div>
//     );
// }

// export default App;
// src/App.js (Example usage)
import React from "react";
import ChatbotLauncher from "./components/ChatbotLauncher"; // Adjust path
import robotAnimation from "./robot.json"; // IMPORTANT: Replace with your actual Lottie JSON import
import "./App.css"; // Ensure Tailwind CSS is imported globally

function App() {
    return (
        <div className="relative min-h-screen">
            <ChatbotLauncher robotAnimationData={robotAnimation} />
        </div>
    );
}

export default App;
