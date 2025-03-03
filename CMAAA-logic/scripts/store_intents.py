#!/usr/bin/env python

import yaml
import sys
import re
from pymongo import MongoClient

def load_nlu_data(file_path):
    """Load intents from nlu.yml file."""
    with open(file_path, 'r') as f:
        nlu_data = yaml.safe_load(f)
    return nlu_data

def parse_examples(examples_text):
    """Parse examples from the YAML format."""
    if not examples_text:
        return []
    
    # Split by lines, remove leading/trailing whitespace
    examples = [line.strip() for line in examples_text.split('\n')]
    
    # Keep only lines that start with '-', and remove the '-'
    examples = [ex[1:].strip() for ex in examples if ex.startswith('-')]
    
    # Remove any empty strings
    examples = [ex for ex in examples if ex]
    
    print(f"Parsed examples: {examples}")
    return examples

def store_intents_in_mongodb(nlu_data, mongo_uri="mongodb://localhost:27017/", 
                            db_name="rasa_nlu", collection_name="intents"):
    """Store intents in MongoDB."""
    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db[collection_name]
    
    # Clear existing intents
    collection.drop()
    
    # Process and store intents
    intents_to_insert = []
    for item in nlu_data.get('nlu', []):
        if 'intent' in item:
            intent_name = item['intent']
            examples = parse_examples(item.get('examples', ''))
            
            if examples:
                intent_doc = {
                    "intent_name": intent_name,
                    "examples": examples
                }
                intents_to_insert.append(intent_doc)
                print(f"Processed intent '{intent_name}' with {len(examples)} examples:")
                for ex in examples:
                    print(f"  - '{ex}'")
    
    if intents_to_insert:
        collection.insert_many(intents_to_insert)
        print(f"Successfully stored {len(intents_to_insert)} intents in MongoDB")
        
        # Verify storage
        for intent in intents_to_insert:
            intent_name = intent["intent_name"]
            stored = collection.find_one({"intent_name": intent_name})
            if stored:
                print(f"Verified intent '{intent_name}' with examples: {stored.get('examples')}")
            else:
                print(f"Warning: Intent '{intent_name}' not found after insertion!")
    else:
        print("No intents found to store")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python store_intents.py path/to/nlu.yml")
        sys.exit(1)
    
    nlu_file = sys.argv[1]
    try:
        nlu_data = load_nlu_data(nlu_file)
        store_intents_in_mongodb(nlu_data)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)