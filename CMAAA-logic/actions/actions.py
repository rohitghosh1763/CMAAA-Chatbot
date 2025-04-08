from typing import Dict, Text, Any, List
from rasa_sdk import Action, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.events import UserUtteranceReverted
from rasa_sdk.executor import CollectingDispatcher
from colorama import Fore, Style, init

init(autoreset=True)

class ActionFetchResponse(Action):
    """Enhanced action with CLI feedback and better error handling."""

    def name(self) -> Text:
        return "action_fetch_response"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any]
    ) -> List[Dict[Text, Any]]:
        
        try:
            # Get response from tracker
            response_text = tracker.latest_message.get("response")
            intent = tracker.latest_message.get("intent", {})
            intent_name = intent.get("intent_name", "nlu_fallback")
            confidence = intent.get("confidence", 0.0)
            
            # Print classification info to CLI
            print(Fore.CYAN + "\n" + "="*50)
            print(Fore.YELLOW + f"Intent: {intent_name}")
            print(Fore.YELLOW + f"Confidence: {confidence:.2f}")
            
            if response_text:
                print(Fore.GREEN + f"Response: {response_text}")
                dispatcher.utter_message(text=response_text)
            else:
                if intent_name == "nlu_fallback":
                    fallback_msg = "I didn't understand that. Could you rephrase?"
                    print(Fore.RED + "No response found - using fallback")
                else:
                    fallback_msg = "I'm not sure how to respond to that."
                    print(Fore.YELLOW + "No response rule for this intent")
                
                dispatcher.utter_message(text=fallback_msg)
            
            print(Fore.CYAN + "="*50 + "\n" + Style.RESET_ALL)
            
        except Exception as e:
            error_msg = f"Error in ActionFetchResponse: {str(e)}"
            print(Fore.RED + error_msg)
            dispatcher.utter_message(text="Sorry, I encountered an error processing your request.")
        
        return []

class ActionDefaultFallback(Action):
    """Enhanced fallback action with CLI feedback."""
    
    def name(self) -> Text:
        return "action_default_fallback"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: "Tracker",
        domain: Dict[Text, Any]
    ) -> List[Dict[Text, Any]]:
        
        print(Fore.RED + "\n" + "!"*50)
        print(Fore.RED + "DEFAULT FALLBACK TRIGGERED")
        print(Fore.RED + "!"*50 + "\n")
        
        dispatcher.utter_message(template="utter_default")
        return [UserUtteranceReverted()]