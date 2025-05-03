import React from "react";
import "./App.css";
import IntentEditor from "./components/Intents";

function App() {
    return <IntentEditor />;
}

export default App;

// import React, { useState, useEffect } from 'react';
// import './App.css';
// import IntentEditor from './components/IntentEditor';

// function App() {
//   const [nluData, setNluData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [message, setMessage] = useState(null);

//   useEffect(() => {
//     fetchNluData();
//   }, []);

//   const fetchNluData = async () => {
//     setLoading(true);
//     try {
//       const response = await fetch('http://localhost:8000/nlu');
//       if (!response.ok) {
//         throw new Error(`HTTP error! Status: ${response.status}`);
//       }
//       const data = await response.json();
//       setNluData(data.content);
//       setError(null);
//     } catch (err) {
//       setError(`Failed to fetch NLU data: ${err.message}`);
//       console.error('Error fetching NLU data:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSaveNlu = async (updatedData) => {
//     setLoading(true);
//     try {
//       const response = await fetch('http://localhost:8000/nlu', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ content: updatedData }),
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! Status: ${response.status}`);
//       }

//       const result = await response.json();
//       setMessage('NLU data saved successfully!');
//       setTimeout(() => setMessage(null), 3000);

//       // Refresh data
//       fetchNluData();
//     } catch (err) {
//       setError(`Failed to save NLU data: ${err.message}`);
//       console.error('Error saving NLU data:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleTrainModel = async () => {
//     setLoading(true);
//     setMessage('Training model... This may take a while.');
//     try {
//       const response = await fetch('http://localhost:8000/train', {
//         method: 'POST',
//       });

//       if (!response.ok) {
//         throw new Error(`HTTP error! Status: ${response.status}`);
//       }

//       const result = await response.json();
//       if (result.success) {
//         setMessage('Model trained successfully!');
//       } else {
//         setError(`Training failed: ${result.error}`);
//       }
//     } catch (err) {
//       setError(`Failed to train model: ${err.message}`);
//       console.error('Error training model:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-4">Rasa NLU Admin Panel</h1>

//       {message && (
//         <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
//           {message}
//         </div>
//       )}

//       {error && (
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//           {error}
//         </div>
//       )}

//       {loading && !nluData ? (
//         <div className="text-center p-4">Loading...</div>
//       ) : (
//         <>
//           <IntentEditor initialData={nluData} onSave={handleSaveNlu} />

//           <div className="mt-6">
//             <button
//               onClick={handleTrainModel}
//               className="bg-purple-500 text-white px-4 py-2 rounded"
//               disabled={loading}
//             >
//               {loading ? 'Processing...' : 'Train Model'}
//             </button>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// export default App;

// // import React, { useState, useEffect } from "react";
// // import axios from "axios";

// // function App() {
// //     const [intents, setIntents] = useState([]);
// //     const [output, setOutput] = useState("");
// //     const [isTraining, setIsTraining] = useState(false);
// //     const [isAddingIntent, setIsAddingIntent] = useState(false);
// //     const [newIntentName, setNewIntentName] = useState("");
// //     const [newExamples, setNewExamples] = useState("");
// //     const [editingIntentIndex, setEditingIntentIndex] = useState(null);

// //     useEffect(() => {
// //         fetchData();
// //     }, []);

// //     const fetchData = () => {
// //         axios
// //             .get("http://localhost:8000/nlu")
// //             .then((res) => {
// //                 try {
// //                     let intentData = [];

// //                     if (res.data && typeof res.data.content === "string") {
// //                         // Try to parse as JSON
// //                         try {
// //                             const parsedData = JSON.parse(res.data.content);
// //                             if (
// //                                 parsedData.nlu &&
// //                                 Array.isArray(parsedData.nlu)
// //                             ) {
// //                                 intentData = parsedData.nlu;
// //                             } else if (
// //                                 parsedData &&
// //                                 Array.isArray(parsedData)
// //                             ) {
// //                                 intentData = parsedData;
// //                             }
// //                         } catch (e) {
// //                             console.error(
// //                                 "Failed to parse content as JSON:",
// //                                 e
// //                             );
// //                         }
// //                     } else if (
// //                         res.data &&
// //                         res.data.nlu &&
// //                         Array.isArray(res.data.nlu)
// //                     ) {
// //                         intentData = res.data.nlu;
// //                     }

// //                     // If we still don't have data, use the example data from the screenshot
// //                     if (intentData.length === 0) {
// //                         intentData = [
// //                             {
// //                                 intent: "greet",
// //                                 examples:
// //                                     "- hey\n- hello\n- hi\n- hello there\n- good morning\n- good evening\n- moin\n- hey there\n- let's go\n- hey dude\n- goodmorning\n- goodevening\n- good afternoon",
// //                             },
// //                             {
// //                                 intent: "goodbye",
// //                                 examples:
// //                                     "- cu\n- good by\n- cee you later\n- good night\n- bye\n- goodbye\n- have a nice day\n- see you around\n- bye bye\n- see you later",
// //                             },
// //                             {
// //                                 intent: "affirm",
// //                                 examples:
// //                                     "- yes\n- y\n- indeed\n- of course\n- that sounds good\n- correct",
// //                             },
// //                             {
// //                                 intent: "deny",
// //                                 examples:
// //                                     "- no\n- n\n- never\n- I don't think so\n- don't like that\n- no way\n- not really",
// //                             },
// //                             {
// //                                 intent: "mood_great",
// //                                 examples:
// //                                     "- perfect\n- great\n- amazing\n- feeling like a king\n- wonderful\n- I am feeling very good\n- I am great\n- I am amazing\n- I am going to save the world\n- super stoked\n- extremely good\n- so so perfect\n- so good\n- so perfect",
// //                             },
// //                             {
// //                                 intent: "mood_unhappy",
// //                                 examples:
// //                                     "- my day was horrible\n- I am sad\n- I don't feel very well\n- I am disappointed\n- super sad\n- I'm so sad\n- sad\n- very sad\n- unhappy\n- not good\n- not very good\n- extremely sad\n- so saad\n- so sad",
// //                             },
// //                             {
// //                                 intent: "bot_challenge",
// //                                 examples:
// //                                     "- are you a bot?\n- are you a human?\n- am I talking to a bot?\n- am I talking to a human?",
// //                             },
// //                         ];
// //                     }

// //                     setIntents(intentData);
// //                 } catch (err) {
// //                     console.error("Error processing data:", err);
// //                     // Fallback to default intents if everything fails
// //                     setIntents([
// //                         { intent: "greet", examples: "- hello\n- hi\n- hey" },
// //                     ]);
// //                 }
// //             })
// //             .catch((err) => {
// //                 console.error("Failed to load:", err);
// //                 // Load example intents from screenshot as fallback
// //                 setIntents([
// //                     {
// //                         intent: "greet",
// //                         examples:
// //                             "- hey\n- hello\n- hi\n- hello there\n- good morning\n- good evening\n- moin\n- hey there\n- let's go\n- hey dude\n- goodmorning\n- goodevening\n- good afternoon",
// //                     },
// //                     {
// //                         intent: "goodbye",
// //                         examples:
// //                             "- cu\n- good by\n- cee you later\n- good night\n- bye\n- goodbye\n- have a nice day\n- see you around\n- bye bye\n- see you later",
// //                     },
// //                     // Add other intents as seen in the screenshot
// //                     {
// //                         intent: "affirm",
// //                         examples:
// //                             "- yes\n- y\n- indeed\n- of course\n- that sounds good\n- correct",
// //                     },
// //                     {
// //                         intent: "deny",
// //                         examples:
// //                             "- no\n- n\n- never\n- I don't think so\n- don't like that\n- no way\n- not really",
// //                     },
// //                 ]);
// //             });
// //     };

// //     const handleSave = async () => {
// //         const yamlContent = {
// //             version: "3.1",
// //             nlu: intents.map((intent) => ({
// //                 intent: intent.intent,
// //                 examples: intent.examples,
// //             })),
// //         };

// //         try {
// //             setOutput("Saving...");
// //             const response = await axios.post(
// //                 "http://localhost:8000/nlu",
// //                 yamlContent
// //             );

// //             if (response.data.success) {
// //                 setOutput("Saved successfully!");
// //                 setTimeout(() => setOutput(""), 3000);
// //             } else {
// //                 setOutput(
// //                     "Save failed: " + (response.data.message || "Unknown error")
// //                 );
// //             }
// //         } catch (err) {
// //             setOutput(
// //                 "Save failed: " + (err.response?.data?.detail || err.message)
// //             );
// //             console.error("Save error:", err);
// //         }
// //     };

// //     const handleTrain = () => {
// //         setIsTraining(true);
// //         setOutput("Training in progress...");

// //         axios
// //             .post("http://localhost:8000/train")
// //             .then((res) => {
// //                 setOutput(
// //                     res.data.output || "Training completed successfully."
// //                 );
// //                 setIsTraining(false);
// //             })
// //             .catch((err) => {
// //                 setOutput("Training failed: " + err.message);
// //                 setIsTraining(false);
// //             });
// //     };

// //     const addNewIntent = () => {
// //         if (newIntentName.trim() === "") {
// //             setOutput("Intent name cannot be empty");
// //             return;
// //         }

// //         const newIntent = {
// //             intent: newIntentName,
// //             examples: newExamples || "- example 1\n- example 2",
// //         };

// //         setIntents([...intents, newIntent]);
// //         setNewIntentName("");
// //         setNewExamples("");
// //         setIsAddingIntent(false);
// //         setOutput("Intent added. Don't forget to save your changes!");
// //     };

// //     const updateIntent = (index) => {
// //         const updatedIntents = [...intents];
// //         updatedIntents[index] = {
// //             intent: newIntentName,
// //             examples: newExamples,
// //         };

// //         setIntents(updatedIntents);
// //         setNewIntentName("");
// //         setNewExamples("");
// //         setEditingIntentIndex(null);
// //         setOutput("Intent updated. Don't forget to save your changes!");
// //     };

// //     const startEditIntent = (index) => {
// //         const intent = intents[index];
// //         setNewIntentName(intent.intent);
// //         setNewExamples(intent.examples);
// //         setEditingIntentIndex(index);
// //     };

// //     const deleteIntent = (index) => {
// //         if (window.confirm("Are you sure you want to delete this intent?")) {
// //             const updatedIntents = intents.filter((_, i) => i !== index);
// //             setIntents(updatedIntents);
// //             setOutput("Intent deleted. Don't forget to save your changes!");
// //         }
// //     };

// //     // Format examples for display - convert from "- example1\n- example2" to array
// //     const formatExamples = (examplesString) => {
// //         if (!examplesString) return [];
// //         return examplesString
// //             .split("\n")
// //             .filter((line) => line.trim().startsWith("-"))
// //             .map((line) => line.trim().substring(1).trim());
// //     };

// //     return (
// //         <div className="min-h-screen bg-gray-900 text-gray-100">
// //             <header className="bg-gray-800 text-white py-4 shadow-lg border-b border-gray-700">
// //                 <div className="container mx-auto px-6">
// //                     <h1 className="text-2xl font-bold tracking-tight">
// //                         Rasa NLU Admin Panel
// //                     </h1>
// //                 </div>
// //             </header>

// //             <main className="container mx-auto px-6 py-8">
// //                 {/* Action buttons */}
// //                 <div className="flex flex-wrap gap-4 mb-8">
// //                     <button
// //                         onClick={handleSave}
// //                         className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md shadow-lg transition duration-200 ease-in-out flex items-center"
// //                     >
// //                         <svg
// //                             xmlns="http://www.w3.org/2000/svg"
// //                             className="h-5 w-5 mr-2"
// //                             viewBox="0 0 20 20"
// //                             fill="currentColor"
// //                         >
// //                             <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h1a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h1v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
// //                         </svg>
// //                         Save Changes
// //                     </button>
// //                     <button
// //                         onClick={handleTrain}
// //                         disabled={isTraining}
// //                         className={`${
// //                             isTraining
// //                                 ? "bg-gray-600"
// //                                 : "bg-green-600 hover:bg-green-700"
// //                         } text-white font-semibold py-2 px-6 rounded-md shadow-lg transition duration-200 ease-in-out flex items-center`}
// //                     >
// //                         <svg
// //                             xmlns="http://www.w3.org/2000/svg"
// //                             className="h-5 w-5 mr-2"
// //                             viewBox="0 0 20 20"
// //                             fill="currentColor"
// //                         >
// //                             <path
// //                                 fillRule="evenodd"
// //                                 d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
// //                                 clipRule="evenodd"
// //                             />
// //                         </svg>
// //                         {isTraining ? "Training in progress..." : "Train Model"}
// //                     </button>
// //                     <button
// //                         onClick={() => setIsAddingIntent(true)}
// //                         className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-md shadow-lg transition duration-200 ease-in-out flex items-center ml-auto"
// //                     >
// //                         <svg
// //                             xmlns="http://www.w3.org/2000/svg"
// //                             className="h-5 w-5 mr-2"
// //                             viewBox="0 0 20 20"
// //                             fill="currentColor"
// //                         >
// //                             <path
// //                                 fillRule="evenodd"
// //                                 d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
// //                                 clipRule="evenodd"
// //                             />
// //                         </svg>
// //                         Add New Intent
// //                     </button>
// //                 </div>

// //                 {/* Status messages */}
// //                 {output && (
// //                     <div className="bg-gray-800 shadow-lg rounded-lg p-4 mb-8 border-l-4 border-blue-500 animate-fadeIn">
// //                         <p className="text-gray-200">{output}</p>
// //                     </div>
// //                 )}

// //                 {/* Add/Edit Intent Form */}
// //                 {(isAddingIntent || editingIntentIndex !== null) && (
// //                     <div className="bg-gray-800 shadow-lg rounded-lg p-6 mb-8 border border-gray-700 animate-slideDown">
// //                         <h2 className="text-xl font-semibold mb-6 text-gray-100 border-b border-gray-700 pb-3">
// //                             {editingIntentIndex !== null
// //                                 ? "Edit Intent"
// //                                 : "Add New Intent"}
// //                         </h2>
// //                         <div className="mb-6">
// //                             <label
// //                                 className="block text-gray-300 mb-2 font-medium"
// //                                 htmlFor="intentName"
// //                             >
// //                                 Intent Name
// //                             </label>
// //                             <input
// //                                 id="intentName"
// //                                 type="text"
// //                                 value={newIntentName}
// //                                 onChange={(e) =>
// //                                     setNewIntentName(e.target.value)
// //                                 }
// //                                 className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
// //                                 placeholder="Enter intent name"
// //                             />
// //                         </div>
// //                         <div className="mb-6">
// //                             <label
// //                                 className="block text-gray-300 mb-2 font-medium"
// //                                 htmlFor="examples"
// //                             >
// //                                 Examples (one per line, each starting with "-")
// //                             </label>
// //                             <textarea
// //                                 id="examples"
// //                                 value={newExamples}
// //                                 onChange={(e) => setNewExamples(e.target.value)}
// //                                 className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-40 font-mono text-white"
// //                                 placeholder="- example one&#10;- example two&#10;- example three"
// //                             />
// //                         </div>
// //                         <div className="flex gap-3">
// //                             <button
// //                                 onClick={
// //                                     editingIntentIndex !== null
// //                                         ? () => updateIntent(editingIntentIndex)
// //                                         : addNewIntent
// //                                 }
// //                                 className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md shadow transition duration-200"
// //                             >
// //                                 {editingIntentIndex !== null
// //                                     ? "Update Intent"
// //                                     : "Add Intent"}
// //                             </button>
// //                             <button
// //                                 onClick={() => {
// //                                     setIsAddingIntent(false);
// //                                     setEditingIntentIndex(null);
// //                                     setNewIntentName("");
// //                                     setNewExamples("");
// //                                 }}
// //                                 className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-md shadow transition duration-200"
// //                             >
// //                                 Cancel
// //                             </button>
// //                         </div>
// //                     </div>
// //                 )}

// //                 {/* Intents List */}
// //                 <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden border border-gray-700">
// //                     <div className="px-6 py-4 bg-gray-700 border-b border-gray-600 flex justify-between items-center">
// //                         <h2 className="text-xl font-semibold text-gray-100">
// //                             Intents
// //                         </h2>
// //                         <span className="bg-gray-600 text-gray-200 px-3 py-1 rounded-full text-sm">
// //                             {intents.length} total
// //                         </span>
// //                     </div>

// //                     {intents.length === 0 ? (
// //                         <div className="p-8 text-center text-gray-400">
// //                             <svg
// //                                 xmlns="http://www.w3.org/2000/svg"
// //                                 className="h-12 w-12 mx-auto mb-4 text-gray-500"
// //                                 fill="none"
// //                                 viewBox="0 0 24 24"
// //                                 stroke="currentColor"
// //                             >
// //                                 <path
// //                                     strokeLinecap="round"
// //                                     strokeLinejoin="round"
// //                                     strokeWidth={2}
// //                                     d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
// //                                 />
// //                             </svg>
// //                             <p>
// //                                 No intents found. Add your first intent to get
// //                                 started.
// //                             </p>
// //                         </div>
// //                     ) : (
// //                         <div className="divide-y divide-gray-700">
// //                             {intents.map((intent, index) => (
// //                                 <div
// //                                     key={index}
// //                                     className="p-6 hover:bg-gray-750 transition duration-150"
// //                                 >
// //                                     <div className="flex items-center justify-between mb-4">
// //                                         <h3 className="text-lg font-semibold text-gray-100 flex items-center">
// //                                             <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
// //                                             {intent.intent}
// //                                         </h3>
// //                                         <div className="flex gap-3">
// //                                             <button
// //                                                 onClick={() =>
// //                                                     startEditIntent(index)
// //                                                 }
// //                                                 className="text-blue-400 hover:text-blue-300 transition duration-150 flex items-center"
// //                                             >
// //                                                 <svg
// //                                                     xmlns="http://www.w3.org/2000/svg"
// //                                                     className="h-4 w-4 mr-1"
// //                                                     viewBox="0 0 20 20"
// //                                                     fill="currentColor"
// //                                                 >
// //                                                     <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
// //                                                 </svg>
// //                                                 Edit
// //                                             </button>
// //                                             <button
// //                                                 onClick={() =>
// //                                                     deleteIntent(index)
// //                                                 }
// //                                                 className="text-red-400 hover:text-red-300 transition duration-150 flex items-center"
// //                                             >
// //                                                 <svg
// //                                                     xmlns="http://www.w3.org/2000/svg"
// //                                                     className="h-4 w-4 mr-1"
// //                                                     viewBox="0 0 20 20"
// //                                                     fill="currentColor"
// //                                                 >
// //                                                     <path
// //                                                         fillRule="evenodd"
// //                                                         d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
// //                                                         clipRule="evenodd"
// //                                                     />
// //                                                 </svg>
// //                                                 Delete
// //                                             </button>
// //                                         </div>
// //                                     </div>

// //                                     <div className="bg-gray-750 rounded-lg p-4 border border-gray-650">
// //                                         <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center">
// //                                             <svg
// //                                                 xmlns="http://www.w3.org/2000/svg"
// //                                                 className="h-4 w-4 mr-1"
// //                                                 viewBox="0 0 20 20"
// //                                                 fill="currentColor"
// //                                             >
// //                                                 <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
// //                                             </svg>
// //                                             Examples (
// //                                             {
// //                                                 formatExamples(intent.examples)
// //                                                     .length
// //                                             }
// //                                             )
// //                                         </h4>
// //                                         <ul className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-2">
// //                                             {formatExamples(
// //                                                 intent.examples
// //                                             ).map((example, i) => (
// //                                                 <li
// //                                                     key={i}
// //                                                     className="text-gray-300 flex items-start"
// //                                                 >
// //                                                     <span className="text-gray-500 mr-2 mt-0.5">
// //                                                         •
// //                                                     </span>{" "}
// //                                                     {example}
// //                                                 </li>
// //                                             ))}
// //                                         </ul>
// //                                     </div>
// //                                 </div>
// //                             ))}
// //                         </div>
// //                     )}
// //                 </div>
// //             </main>

// //             <style jsx>{`
// //                 .animate-fadeIn {
// //                     animation: fadeIn 0.3s ease-in-out;
// //                 }
// //                 .animate-slideDown {
// //                     animation: slideDown 0.3s ease-in-out;
// //                 }
// //                 @keyframes fadeIn {
// //                     from {
// //                         opacity: 0;
// //                     }
// //                     to {
// //                         opacity: 1;
// //                     }
// //                 }
// //                 @keyframes slideDown {
// //                     from {
// //                         transform: translateY(-10px);
// //                         opacity: 0;
// //                     }
// //                     to {
// //                         transform: translateY(0);
// //                         opacity: 1;
// //                     }
// //                 }
// //                 .bg-gray-750 {
// //                     background-color: #1f2937;
// //                 }
// //                 .bg-gray-650 {
// //                     background-color: #374151;
// //                 }
// //                 .custom-scrollbar::-webkit-scrollbar {
// //                     width: 6px;
// //                 }
// //                 .custom-scrollbar::-webkit-scrollbar-track {
// //                     background: #1f2937;
// //                     border-radius: 3px;
// //                 }
// //                 .custom-scrollbar::-webkit-scrollbar-thumb {
// //                     background: #4b5563;
// //                     border-radius: 3px;
// //                 }
// //             `}</style>
// //         </div>
// //     );
// // }

// // export default App;
