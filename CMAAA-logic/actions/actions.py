from pymongo import MongoClient
from rasa_sdk import Action
from rasa_sdk.events import SlotSet

class ActionFetchResponse(Action):
    def name(self):
        return "action_fetch_response"

    def run(self, dispatcher, tracker, domain):
        user_intent = tracker.latest_message['intent'].get('name')

        # Connect to MongoDB
        client = MongoClient("mongodb://localhost:27017/")
        db = client["CMAAA"]
        intents_collection = db["intents"]

        # Fetch response from MongoDB
        intent_data = intents_collection.find_one({"intent": user_intent})

        if intent_data and "responses" in intent_data:
            response_text = intent_data["responses"][0]  # Choose first response
            dispatcher.utter_message(text=response_text)
        else:
            dispatcher.utter_message(text="I am not sure how to respond.")

        return []
