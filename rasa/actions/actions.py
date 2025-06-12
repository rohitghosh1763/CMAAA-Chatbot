from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SessionStarted, ActionExecuted, EventType
from typing import Any, Dict, List
from pymongo import MongoClient
from datetime import datetime

class ActionDefaultFallback(Action):
    def name(self) -> str:
        return "action_default_fallback"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[str, Any]) -> List[Dict[str, Any]]:
        # Get the original message
        user_message = tracker.latest_message.get("text", "")
       
        # Get the confidence scores from NLU for MongoDB storage only
        nlu_data = tracker.latest_message
        intent_ranking = nlu_data.get("intent_ranking", [])
       
        # Store unknown query in MongoDB
        try:
            client = MongoClient('mongodb://localhost:27017/')
            db = client['cmaaa']
            collection = db['unknown-queries']
           
            # Create document to insert
            document = {
                'query': user_message,
                'timestamp': datetime.now(),
                'intent_ranking': intent_ranking
            }
           
            # Insert into MongoDB
            collection.insert_one(document)
           
        except Exception as e:
            print(f"Error storing unknown query in MongoDB: {e}")
       
        # Call the response defined in domain.yml (only this will appear to user)
        dispatcher.utter_message(response="utter_default")
       
        return []


  #?  For debugging:

    # class ActionDefaultFallback(Action):

    # def name(self) -> str:
    #     return "action_default_fallback"

    # def run(self, dispatcher: CollectingDispatcher,
    #         tracker: Tracker,
    #         domain: Dict[str, Any]) -> List[Dict[str, Any]]:

    #     # Get the original message to help with debugging
    #     user_message = tracker.latest_message.get("text", "")
    #     print(f"User message: {user_message}")  # Use the variable to avoid linter warning
        
    #     # Get the confidence scores from NLU
    #     nlu_data = tracker.latest_message
    #     intent_ranking = nlu_data.get("intent_ranking", [])
    #     # Format confidence information
    #     confidence_info = "Intent confidence scores:\n"
    #     if intent_ranking:
    #         for intent in intent_ranking[:3]:  # Show top 3 intents
    #             name = intent.get('name', 'unknown')
    #             confidence = intent.get('confidence', 0.0)
    #             confidence_info += f"- {name}: {confidence:.2f}\n"
    #     else:
    #         confidence_info += "No intent confidence information available\n"
    #         # Log relevant information about the tracker for debugging
    #         print(f"Domain keys: {domain.keys()}")  # Use domain to avoid linter warning
    #         confidence_info += f"- {intent.get('name')}: {intent.get('confidence'):.2f}\n"