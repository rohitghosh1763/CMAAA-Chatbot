import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose
    .connect("mongodb://localhost:27017/CMAAA", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Intent Schema
const intentSchema = new mongoose.Schema({
    intent_name: { type: String, required: true, unique: true },
    examples: [{ type: String }],
});

const Intent = mongoose.model("Intent", intentSchema);

// Routes
// Get all intents
app.get("/intents", async (req, res) => {
    try {
        const intents = await Intent.find();
        res.json(intents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new intent
app.post("/intents", async (req, res) => {
    const { intent_name, examples } = req.body;
    try {
        const newIntent = new Intent({
            intent_name,
            examples,
        });
        const savedIntent = await newIntent.save();
        res.status(201).json(savedIntent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update intent
app.put("/intents/:id", async (req, res) => {
    const { intent_name, examples } = req.body;
    try {
        const updatedIntent = await Intent.findByIdAndUpdate(
            req.params.id,
            {
                intent_name,
                examples,
                updated_at: Date.now(),
            },
            { new: true }
        );
        if (!updatedIntent) {
            return res.status(404).json({ message: "Intent not found" });
        }
        res.json(updatedIntent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete intent
app.delete("/intents/:id", async (req, res) => {
    try {
        const deletedIntent = await Intent.findByIdAndDelete(req.params.id);
        if (!deletedIntent) {
            return res.status(404).json({ message: "Intent not found" });
        }
        res.json({ message: "Intent deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Updated chat endpoint to forward requests to Rasa
app.post("/chat", async (req, res) => {
    const { message } = req.body;

    try {
        // Forward the message to Rasa
        const rasaResponse = await axios.post(
            "http://localhost:5005/webhooks/rest/webhook",
            {
                sender: "user", // You can use a dynamic user ID if needed
                message: message,
            }
        );

        // Return the Rasa response
        res.json(rasaResponse.data);
    } catch (error) {
        console.error("Error communicating with Rasa:", error);
        res.status(500).json([
            {
                text: "Sorry, I'm having trouble communicating with the bot service. Please try again later.",
            },
        ]);
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
