import logging
import datetime
from typing import Any, Dict, List, Text, Optional
from difflib import SequenceMatcher
from pymongo import MongoClient
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError
from rasa.engine.graph import GraphComponent, ExecutionContext
from rasa.engine.recipes.default_recipe import DefaultV1Recipe
from rasa.engine.storage.resource import Resource
from rasa.engine.storage.storage import ModelStorage
from rasa.shared.nlu.training_data.message import Message
from rasa.shared.nlu.constants import TEXT, INTENT, INTENT_NAME_KEY, INTENT_RANKING_KEY
from colorama import Fore, Style, init

# Initialize colorama for colored CLI output
init(autoreset=True)
logger = logging.getLogger(__name__)

@DefaultV1Recipe.register(
    [DefaultV1Recipe.ComponentType.INTENT_CLASSIFIER], is_trainable=False
)
class MongoDBIntentClassifier(GraphComponent):
    """Advanced MongoDB intent classifier with fuzzy matching and rich CLI output."""

    def __init__(self, config: Dict[Text, Any]) -> None:
        """Initialize classifier with configuration."""
        self.config = config
        self._validate_config()
        self._init_mongodb_connection()
        self._print_cli_header()

    def _validate_config(self) -> None:
        """Validate required configuration parameters."""
        required_keys = ["mongodb_uri", "db_name"]
        for key in required_keys:
            if key not in self.config:
                raise ValueError(f"Missing required config key: {key}")

        self.mongodb_uri = self.config["mongodb_uri"]
        self.db_name = self.config["db_name"]
        self.intent_collection_name = self.config.get("intent_collection_name", "intents")
        self.rules_collection_name = self.config.get("rules_collection_name", "rules")
        self.unclassified_collection_name = self.config.get("unclassified_collection_name", "unclassified_queries")
        self.confidence_threshold = float(self.config.get("confidence_threshold", 0.7))
        self.top_n = int(self.config.get("top_n", 3))  # Number of top intents to consider

    def _init_mongodb_connection(self) -> None:
        """Initialize and test MongoDB connection."""
        self.client = None
        self.db = None
        self.intent_collection = None
        self.rules_collection = None
        self.unclassified_collection = None

        try:
            self.client = MongoClient(
                self.mongodb_uri,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=10000,
                socketTimeoutMS=30000
            )
            # Force connection test
            self.client.server_info()
            
            self.db = self.client[self.db_name]
            self.intent_collection = self.db[self.intent_collection_name]
            self.rules_collection = self.db[self.rules_collection_name]
            self.unclassified_collection = self.db[self.unclassified_collection_name]

            # Verify collections exist
            if self.intent_collection_name not in self.db.list_collection_names():
                raise ValueError(f"Collection '{self.intent_collection_name}' not found")

            logger.info("MongoDB connection established successfully")
            self._print_cli_message(f"Connected to MongoDB: {self.db_name}", color=Fore.GREEN)

        except ServerSelectionTimeoutError as e:
            error_msg = f"Failed to connect to MongoDB: {str(e)}"
            logger.error(error_msg)
            self._print_cli_message(error_msg, color=Fore.RED)
            raise
        except PyMongoError as e:
            error_msg = f"MongoDB error: {str(e)}"
            logger.error(error_msg)
            self._print_cli_message(error_msg, color=Fore.RED)
            raise

    def _print_cli_header(self) -> None:
        """Print initialization header to CLI."""
        self._print_cli_message("\n" + "="*50, color=Fore.CYAN)
        self._print_cli_message("MongoDB Intent Classifier Initialized", color=Fore.CYAN)
        self._print_cli_message(f"Database: {self.db_name}", color=Fore.CYAN)
        self._print_cli_message(f"Intent Collection: {self.intent_collection_name}", color=Fore.CYAN)
        self._print_cli_message(f"Confidence Threshold: {self.confidence_threshold}", color=Fore.CYAN)
        self._print_cli_message("="*50 + "\n", color=Fore.CYAN)

    def _print_cli_message(self, message: str, color: str = Fore.WHITE) -> None:
        """Print formatted message to CLI."""
        print(color + message + Style.RESET_ALL)

    def process(self, messages: List[Message]) -> List[Message]:
        """Process messages with enhanced error handling and CLI output."""
        if not self.client:
            self._print_cli_message("MongoDB connection not available!", color=Fore.RED)
            for message in messages:
                self._set_fallback_intent(message)
            return messages

        try:
            for message in messages:
                self._classify_intent_with_feedback(message)
        except PyMongoError as e:
            error_msg = f"MongoDB operation failed: {str(e)}"
            logger.error(error_msg)
            self._print_cli_message(error_msg, color=Fore.RED)
            for message in messages:
                self._set_fallback_intent(message)

        return messages

    def _classify_intent_with_feedback(self, message: Message) -> None:
        """Classify intent with CLI feedback and detailed logging."""
        text = message.get(TEXT, "").strip()
        if not text:
            return

        self._print_cli_message(f"\nProcessing query: '{text}'", color=Fore.YELLOW)

        try:
            # Get all possible intents and their examples
            intent_candidates = []
            for intent_doc in self.intent_collection.find({}):
                intent_name = intent_doc.get("intent_name")
                for example in intent_doc.get("examples", []):
                    similarity = SequenceMatcher(None, text.lower(), example.lower()).ratio()
                    intent_candidates.append((intent_name, example, similarity))

            if not intent_candidates:
                self._print_cli_message("No intent examples found in database", color=Fore.RED)
                self._set_fallback_intent(message)
                return

            # Sort by similarity score
            intent_candidates.sort(key=lambda x: x[2], reverse=True)
            top_intents = intent_candidates[:self.top_n]

            # Display classification candidates in CLI
            self._print_cli_message("\nTop matching intents:", color=Fore.CYAN)
            for idx, (intent_name, example, score) in enumerate(top_intents, 1):
                color = Fore.GREEN if score >= self.confidence_threshold else Fore.YELLOW
                self._print_cli_message(
                    f"{idx}. {intent_name} (score: {score:.2f}) - Example: '{example}'",
                    color=color
                )

            best_intent, best_example, best_score = top_intents[0]

            if best_score >= self.confidence_threshold:
                self._print_cli_message(
                    f"\n✅ Best match: {best_intent} (confidence: {best_score:.2f})",
                    color=Fore.GREEN
                )
                
                intent = {
                    INTENT_NAME_KEY: best_intent,
                    "confidence": best_score,
                    "matched_example": best_example
                }
                message.set(INTENT, intent, add_to_output=True)
                
                # Add intent ranking for debugging
                intent_ranking = [
                    {INTENT_NAME_KEY: name, "confidence": score}
                    for name, _, score in top_intents
                ]
                message.set(INTENT_RANKING_KEY, intent_ranking, add_to_output=True)

                # Fetch response if available
                self._fetch_and_set_response(message, best_intent)
            else:
                self._print_cli_message(
                    f"\n⚠️ No confident match found (best score: {best_score:.2f})",
                    color=Fore.YELLOW
                )
                self._store_unclassified_query(text)
                self._set_fallback_intent(message)

        except PyMongoError as e:
            error_msg = f"Classification failed: {str(e)}"
            logger.error(error_msg)
            self._print_cli_message(error_msg, color=Fore.RED)
            self._set_fallback_intent(message)

    def _fetch_and_set_response(self, message: Message, intent_name: str) -> None:
        """Fetch and set response with CLI feedback."""
        if self.rules_collection is None:
            return

        try:
            rule = self.rules_collection.find_one(
                {"intent": intent_name},
                {"response": 1, "_id": 0}
            )
            
            if rule and rule.get("response"):
                response = rule["response"]
                message.set("response", response, add_to_output=True)
                self._print_cli_message(f"💬 Response: {response}", color=Fore.BLUE)
            else:
                self._print_cli_message("No response rule found for this intent", color=Fore.YELLOW)
                
        except PyMongoError as e:
            error_msg = f"Failed to fetch response: {str(e)}"
            logger.error(error_msg)
            self._print_cli_message(error_msg, color=Fore.RED)

    def _set_fallback_intent(self, message: Message) -> None:
        """Set fallback intent with CLI notification."""
        fallback_intent = {INTENT_NAME_KEY: "nlu_fallback", "confidence": 0.0}
        message.set(INTENT, fallback_intent, add_to_output=True)
        self._print_cli_message("Using fallback intent", color=Fore.RED)

    def _store_unclassified_query(self, text: str) -> None:
        """Store unclassified query with error handling."""
        if self.unclassified_collection is None:
            return

        try:
            self.unclassified_collection.insert_one({
                "text": text,
                "date": datetime.datetime.now(),
                "processed": False,
                "confidence": 0.0
            })
            self._print_cli_message("Stored unclassified query for review", color=Fore.YELLOW)
        except PyMongoError as e:
            error_msg = f"Failed to store unclassified query: {str(e)}"
            logger.error(error_msg)
            self._print_cli_message(error_msg, color=Fore.RED)

    @classmethod
    def create(
        cls,
        config: Dict[Text, Any],
        model_storage: ModelStorage,
        resource: Resource,
        execution_context: ExecutionContext,
    ) -> GraphComponent:
        return cls(config)

    @classmethod
    def required_components(cls) -> List[Text]:
        return []

    def persist(self) -> None:
        """Clean up resources."""
        if self.client:
            try:
                self.client.close()
                self._print_cli_message("Closed MongoDB connection", color=Fore.CYAN)
            except Exception as e:
                logger.error(f"Error closing MongoDB connection: {str(e)}")