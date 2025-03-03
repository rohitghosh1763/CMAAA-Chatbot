import logging
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
    """Custom intent classifier that queries MongoDB for intent prediction."""

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
        self.db_name = config.get("db_name", "rasa_nlu")
        self.collection_name = config.get("collection_name", "intents")
        self.confidence_threshold = config.get("confidence_threshold", 0.7)
           
        try:
            self.client = MongoClient(self.mongodb_uri)
            self.db = self.client[self.db_name]
            self.collection = self.db[self.collection_name]
            
            # Test the connection
            collection_exists = self.collection_name in self.db.list_collection_names()
            if collection_exists:
                count = self.collection.count_documents({})
                logger.info(f"✅ Successfully connected to MongoDB. Found {count} intents in the collection.")
            else:
                logger.error(f"❌ Collection '{self.collection_name}' not found in database '{self.db_name}'")
                
            # Print a sample intent for verification
            sample = self.collection.find_one({})
            if sample:
                logger.info(f"Sample intent: {sample.get('intent_name')} with {len(sample.get('examples', []))} examples")
        except Exception as e:
            logger.error(f"❌ Failed to connect to MongoDB: {e}")
            # Create dummy collection to avoid errors
            self.client = None
            self.db = None
            self.collection = None

    def process(self, messages: List[Message]) -> List[Message]:
        """Process a list of messages and classify their intents using MongoDB."""
        for message in messages:
            self._classify_intent(message)
        return messages

    def _classify_intent(self, message: Message) -> None:
        """Query MongoDB to classify the intent of a message."""
        text = message.get("text")
        
        if not text:
            return
            
        if self.collection is None:
            logger.error("❌ MongoDB collection not available. Skipping intent classification.")
            fallback_intent = {"name": "nlu_fallback", "confidence": 0.3}
            message.set("intent", fallback_intent, add_to_output=True)
            return
        
        logger.info(f"🔍 Trying to classify text: '{text}'")
        
        # Try direct match first
        logger.debug(f"Attempting exact match for '{text}'")
        result = self.collection.find_one(
            {"examples": text},
            {"intent_name": 1, "_id": 0}
        )
        
        # If no exact match, try case-insensitive match
        if not result:
            logger.debug(f"No exact match, trying case-insensitive match for '{text}'")
            result = self.collection.find_one(
                {"examples": {"$regex": f"^{text}$", "$options": "i"}},
                {"intent_name": 1, "_id": 0}
            )
            
        # If still no match, try partial match (contains)
        if not result:
            logger.debug(f"No exact or case-insensitive match, trying partial match for '{text}'")
            result = self.collection.find_one(
                {"examples": {"$regex": text, "$options": "i"}},
                {"intent_name": 1, "_id": 0}
            )
            
        # You can add more sophisticated matching here
        
        if result:
            intent_name = result.get("intent_name")
            intent = {"name": intent_name, "confidence": 0.98}
            message.set("intent", intent, add_to_output=True)
            logger.info(f"✅ MongoDB classified '{text}' as '{intent_name}'")
        else:
            # For debugging, list all intents and examples
            logger.info(f"❌ No intent match found in MongoDB for '{text}'")
            logger.debug("Available intents and examples:")
            for intent_doc in self.collection.find({}, {"intent_name": 1, "examples": 1, "_id": 0}):
                logger.debug(f"Intent: {intent_doc.get('intent_name')}, Examples: {intent_doc.get('examples')}")
                
            fallback_intent = {"name": "nlu_fallback", "confidence": 0.3}
            message.set("intent", fallback_intent, add_to_output=True)

    @classmethod
    def required_components(cls) -> List[Text]:
        """Components that should be included in the pipeline before this component."""
        return []

    def persist(self) -> None:
        """Nothing to persist as the data is stored in MongoDB."""
        pass