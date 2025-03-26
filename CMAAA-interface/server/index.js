import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

mongoose
    .connect("mongodb://localhost:27017/CMAAA", {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));

const intentSchema = new mongoose.Schema({
    intent_name: { type: String, required: true, unique: true },
    examples: [{ type: String }],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

const unclassifiedQuerySchema = new mongoose.Schema(
    {
        text: { type: String, required: true },
        date: {
            type: String,
            default: () => {
                let today = new Date();
                return today.toISOString().split("T")[0]; // Formats as "YYYY-MM-DD"
            },
        },
    },
    { collection: "unclassified_queries" } // Note: fixed spelling here
);

const ruleSchema = new mongoose.Schema({
    intent: String,
    response: String,
});

const Intent = mongoose.model("Intent", intentSchema);
const Rule = mongoose.model("rules", ruleSchema);
const UnclassifiedQuery = mongoose.model(
    "UnclassifiedQuery",
    unclassifiedQuerySchema,
    "unclassified_queries"
);

// Intent routes
app.get("/intents", async (req, res) => {
    try {
        const intents = await Intent.find().sort({ created_at: -1 });
        res.json(intents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/intents", async (req, res) => {
    const { intent_name, examples } = req.body;
    try {
        const newIntent = new Intent({
            intent_name,
            examples,
            created_at: Date.now(),
            updated_at: Date.now(),
        });
        const savedIntent = await newIntent.save();
        res.status(201).json(savedIntent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

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

app.get("/unclassified-queries", async (req, res) => {
    try {
        const queries = await UnclassifiedQuery.find().sort({ first_seen: -1 });
        res.json(queries);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete("/unclassified-queries/:id", async (req, res) => {
    try {
        const deleteUnclassifiedQuery =
            await UnclassifiedQuery.findByIdAndDelete(req.params.id);
        if (!deleteUnclassifiedQuery) {
            return res
                .status(404)
                .json({ message: "Unclassified Query not found" });
        }
        res.json({ message: "Unclassified Query deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post("/unclassified-queries/handle", async (req, res) => {
    const { queryId, intentName, example } = req.body;
    try {
        if (intentName) {
            const intent = await Intent.findOne({ intent_name: intentName });
            if (intent) {
                intent.examples.push(example);
                await intent.save();
            } else {
                const newIntent = new Intent({
                    intent_name: intentName,
                    examples: [example],
                });
                await newIntent.save();
            }
        }

        await UnclassifiedQuery.findByIdAndDelete(queryId);
        res.status(200).json({ message: "Query handled successfully" });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Add a new rule
app.post("/rules", async (req, res) => {
    try {
        const { intent, response } = req.body;
        const newRule = new Rule({ intent, response });
        await newRule.save();
        res.json({ message: "Rule added successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all rules
app.get("/rules", async (req, res) => {
    try {
        const rules = await Rule.find();
        res.json(rules);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a rule
app.put("/rules/:id", async (req, res) => {
    try {
        const { intent, response } = req.body;
        await Rule.findByIdAndUpdate(req.params.id, { intent, response });
        res.json({ message: "Rule updated successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a rule
app.delete("/rules/:id", async (req, res) => {
    try {
        await Rule.findByIdAndDelete(req.params.id);
        res.json({ message: "Rule deleted successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/chat", async (req, res) => {
    const { message } = req.body;
    try {
        const rasaResponse = await axios.post(
            "http://localhost:5005/webhooks/rest/webhook",
            { sender: "user", message }
        );

        if (!rasaResponse.data || rasaResponse.data.length === 0) {
            await new UnclassifiedQuery({ text: message }).save();
        }

        res.json(rasaResponse.data);
    } catch (error) {
        console.error("Error communicating with Rasa:", error);

        await new UnclassifiedQuery({ text: message }).save();

        res.status(500).json([
            {
                text: "Sorry, I'm having trouble communicating with the bot service. Please try again later.",
            },
        ]);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
