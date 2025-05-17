import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Route to handle chat messages and forward them to Rasa
app.post("/chat", async (req, res) => {
    const { message } = req.body; // User's message
    const senderId = req.body.sender || "user"; // Use sender from request or default to "user"

    if (!message) {
        return res.status(400).json([{ text: "Message cannot be empty." }]);
    }

    try {
        // Forward the message to the Rasa API
        // Ensure your Rasa server is running at this URL
        const rasaResponse = await axios.post(
            "http://localhost:5005/webhooks/rest/webhook",
            {
                sender: senderId, // Use a unique sender ID for session management with Rasa
                message: message,
            }
        );

        // Send Rasa's response back to the client
        res.json(rasaResponse.data);
    } catch (error) {
        console.error("Error communicating with Rasa:", error.message);
        // Log the error or specific parts of it
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error("Rasa Response Error Data:", error.response.data);
            console.error("Rasa Response Error Status:", error.response.status);
        } else if (error.request) {
            // The request was made but no response was received
            console.error("Rasa No Response:", error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error("Axios Error:", error.message);
        }

        // Send a generic error message to the client
        res.status(500).json([
            {
                text: "Sorry, I'm having trouble communicating with the bot service. Please try again later.",
            },
        ]);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(
        "Ready to proxy messages to Rasa at http://localhost:5005/webhooks/rest/webhook"
    );
});
