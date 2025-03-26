from pymongo import MongoClient
from rasa_sdk import Action
from rasa_sdk.events import SlotSet

class ActionFetchResponse(Action):
    def name(self):
        return "action_fetch_response"

    def run(self, dispatcher, tracker, domain):
        user_intent = tracker.latest_message['intent'].get('name')

        #? MongoDB Connection
        client = MongoClient("mongodb://localhost:27017/")
        db = client["CMAAA"]
        rules_collection = db["rules"]  # ✅ Lookup rules instead of default Rasa rules

        #? Fetch rule from MongoDB
        rule_data = rules_collection.find_one({"intent": user_intent})

        if rule_data and "response" in rule_data:  # ✅ Check if response exists
            response_text = rule_data["response"]
            dispatcher.utter_message(text=response_text)
        else:
            dispatcher.utter_message(text="I am not sure how to respond.")

        client.close()  # ✅ Close the connection
        return []



# from pymongo import MongoClient
# from rasa_sdk import Action
# from rasa_sdk.events import SlotSet

# class ActionFetchResponse(Action):
#     def name(self):
#         return "action_fetch_response"

#     def run(self, dispatcher, tracker, domain):
#         user_intent = tracker.latest_message['intent'].get('name')

#         #? MongoDB Connection
#         client = MongoClient("mongodb://localhost:27017/")
#         db = client["CMAAA"]
#         intents_collection = db["intents"]

#         #? Fetching responses from MongoDB
#         intent_data = intents_collection.find_one({"intent": user_intent})

#         if intent_data and "responses" in intent_data:
#             response_text = intent_data["responses"][0]  # Choose first response
#             dispatcher.utter_message(text=response_text)
#         else:
#             dispatcher.utter_message(text="I am not sure how to respond.")

#         return []
