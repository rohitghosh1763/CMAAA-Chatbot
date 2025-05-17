from rasa_sdk import Action
from rasa_sdk.executor import CollectingDispatcher

class ActionDefaultFallback(Action):

    def name(self) -> str:
        return "action_default_fallback"

    def run(self, dispatcher: CollectingDispatcher,
            tracker, domain):
        
        dispatcher.utter_message(text="I couldn't understand that.")
        return []
