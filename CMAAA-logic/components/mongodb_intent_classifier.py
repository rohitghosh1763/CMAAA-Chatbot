import logging
import datetime
from typing import Any, Dict, List, Text, Optional

from rasa.engine.graph import GraphComponent, ExecutionContext
from rasa.engine.recipes.default_recipe import DefaultV1Recipe
from rasa.engine.storage.resource import Resource
from rasa.engine.storage.storage import ModelStorage
from rasa.shared.nlu.training_data.message import Message
from rasa.shared.nlu.training_data.training_data import TrainingData
from pymongo import MongoClient

logger = logging.getLogger(__name__)

@DefaultV1Recipe.register(
    [DefaultV1Recipe.ComponentType.INTENT_CLASSIFIER], is_trainable=False
)
class MongoDBIntentClassifier(GraphComponent):
    """Custom intent classifier that queries MongoDB for intent prediction and rule-based responses."""

    @classmethod
    def create(
        cls,
        config: Dict[Text, Any],
        model_storage: ModelStorage,
        resource: Resource,
        execution_context: ExecutionContext,
    ) -> GraphComponent:
        return cls(config)

    def __init__(self, config: Dict[Text, Any]) -> None:
        """Initialize the MongoDB intent classifier."""
        self.config = config
        self.mongodb_uri = config.get("mongodb_uri", "mongodb://localhost:27017/")
        self.db_name = config.get("db_name", "CMAAA")
        self.intent_collection_name = config.get("intent_collection_name", "intents")
        self.rules_collection_name = config.get("rules_collection_name", "rules")
        self.unclassified_collection_name = config.get("unclassified_collection_name", "unclassified_queries")
        self.confidence_threshold = config.get("confidence_threshold", 0.7)
        
        try:
            self.client = MongoClient(self.mongodb_uri)
            self.db = self.client[self.db_name]
            self.intent_collection = self.db[self.intent_collection_name]
            self.rules_collection = self.db[self.rules_collection_name]
            self.unclassified_collection = self.db[self.unclassified_collection_name]

            # ? Connection Testing
            if self.intent_collection_name in self.db.list_collection_names():
                count = self.intent_collection.count_documents({})
                logger.info(f"✅ Connected to MongoDB. Found {count} intents in '{self.intent_collection_name}'.")
            else:
                logger.error(f"❌ Collection '{self.intent_collection_name}' not found in database '{self.db_name}'")

            if self.rules_collection_name in self.db.list_collection_names():
                count = self.rules_collection.count_documents({})
                logger.info(f"✅ Found {count} rules in '{self.rules_collection_name}'.")
            else:
                logger.warning(f"⚠️ No rules found in '{self.rules_collection_name}'.")

        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            self.client = None
            self.db = None
            self.intent_collection = None
            self.rules_collection = None
            self.unclassified_collection = None

    def process(self, messages: List[Message]) -> List[Message]:
        """Process messages by classifying intents and retrieving rule-based responses."""
        for message in messages:
            self._classify_intent_and_fetch_rule(message)
        return messages

    def _classify_intent_and_fetch_rule(self, message: Message) -> None:
        """Classify the intent and retrieve the response rule from MongoDB."""
        text = message.get("text")

        if not text:
            return
        
        if self.intent_collection is None:
            logger.error("❌ MongoDB intent collection not available. Skipping intent classification.")
            fallback_intent = {"name": "nlu_fallback", "confidence": 0.3}
            message.set("intent", fallback_intent, add_to_output=True)
            return
        
        logger.info(f"🔍 Classifying text: '{text}'")
        
        # Try exact, case-insensitive, and partial matches
        intent_result = self.intent_collection.find_one(
            {"examples": {"$regex": f"^{text}$", "$options": "i"}},
            {"intent_name": 1, "_id": 0}
        )

        if intent_result:
            intent_name = intent_result.get("intent_name")
            intent = {"name": intent_name, "confidence": 0.98}
            message.set("intent", intent, add_to_output=True)
            logger.info(f"✅ Classified '{text}' as '{intent_name}'")
            
            # ? Lookup rules for this intent
            response = self._fetch_rule_response(intent_name)
            if response:
                message.set("response", response, add_to_output=True)
                logger.info(f"💬 Response for '{intent_name}': {response}")
            else:
                logger.warning(f"⚠️ No rule response found for intent '{intent_name}'.")
            
        else:
            logger.info(f"❌ No intent match found in MongoDB for '{text}'")
            self._store_unclassified_query(text)

            fallback_intent = {"name": "nlu_fallback", "confidence": 0.3}
            message.set("intent", fallback_intent, add_to_output=True)

    def _fetch_rule_response(self, intent_name: str) -> Optional[str]:
        """Retrieve a response from the rules collection based on the intent."""
        if self.rules_collection is None:
            logger.error("❌ MongoDB rules collection not available. Skipping rule lookup.")
            return None

        rule = self.rules_collection.find_one(
            {"intent": intent_name},
            {"response": 1, "_id": 0}
        )
        return rule.get("response") if rule else None

    def _store_unclassified_query(self, text: str) -> None:
        """Store unclassified queries for later review."""
        if self.unclassified_collection is None:
            logger.error("❌ MongoDB unclassified collection not available. Skipping storage.")
            return
        
        try:
            self.unclassified_collection.insert_one({
                "text": text,
                "date": datetime.datetime.now()
            })
            logger.info(f"➕ Stored unclassified query: '{text}'")
            
        except Exception as e:
            logger.error(f"❌ Failed to store unclassified query: {e}")

    @classmethod
    def required_components(cls) -> List[Text]:
        """Components that should be included in the pipeline before this component."""
        return []

    def persist(self) -> None:
        """Nothing to persist as the data is stored in MongoDB."""
        pass



