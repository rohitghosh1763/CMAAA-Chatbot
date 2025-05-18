from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SessionStarted, ActionExecuted, EventType
from typing import Any, Dict, List
# class ActionDefaultFallback(Action):

#     def name(self) -> str:
#         return "action_default_fallback"

#     def run(self, dispatcher: CollectingDispatcher,
#             tracker, domain):
        
#         dispatcher.utter_message(text="I couldn't understand that.")
#         return []
class ActionDefaultFallback(Action):

    def name(self) -> str:
        return "action_default_fallback"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[str, Any]) -> List[Dict[str, Any]]:

        # Call the response defined in domain.yml
        dispatcher.utter_message(response="utter_default")
        return []
class ActionSessionStart(Action):
    def name(self) -> str:
        return "action_session_start"

    async def run(self, dispatcher: CollectingDispatcher,
                  tracker: Tracker,
                  domain: dict) -> list[EventType]:

        # the default session start action
        events = [SessionStarted(), ActionExecuted("action_listen")]

        # Send a welcome message
        dispatcher.utter_message(text="Welcome, how can I help you?")

        return events
