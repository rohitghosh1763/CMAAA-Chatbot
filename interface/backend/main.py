from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import subprocess
from pathlib import Path
import os
from ruamel.yaml import YAML
from pydantic import BaseModel
import re

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to the Rasa files 
RASA_ROOT = Path(os.getenv("RASA_PATH", "../../logic"))  # Goes up to your-rasa-project/
NLU_PATH = RASA_ROOT / "data" / "nlu.yml"

class NLUContent(BaseModel):
    content: dict  # Dictionary structure from the frontend

@app.get("/")
async def root():
    return {"message": "Admin panel API is running!"}

@app.get("/nlu")
def get_nlu():
    """Read current nlu.yml content"""
    if not NLU_PATH.exists():
        raise HTTPException(404, "nlu.yml not found")
    
    # Read the file directly to preserve formatting
    with open(NLU_PATH, "r") as f:
        raw_yaml = f.read()
    
    # Parse with ruamel.yaml to get structured data
    yaml = YAML()
    yaml.preserve_quotes = False
    yaml.explicit_start = True
    
    # Load the YAML content
    with open(NLU_PATH, "r") as f:
        parsed_content = yaml.load(f)
    
    return {"content": parsed_content}

@app.post("/nlu")
def update_nlu(nlu_data: NLUContent):
    """Save edits to nlu.yml with proper formatting"""
    try:
        # Create a custom YAML handler
        yaml = YAML()
        yaml.preserve_quotes = False
        yaml.explicit_start = True
        yaml.indent(mapping=2, sequence=4, offset=2)
        
        # Process the examples to ensure they use literal block format
        nlu_content = nlu_data.content
        if "nlu" in nlu_content:
            for intent in nlu_content["nlu"]:
                if "examples" in intent:
                    # Ensure examples has the proper block literal format
                    if isinstance(intent["examples"], str):
                        # Clean the string - remove any existing formatting artifacts
                        examples_text = intent["examples"]
                        # Remove quotes and escaped newlines if present
                        examples_text = examples_text.replace('\\n', '\n')
                        examples_text = re.sub(r'^["\'](.*)["\']$', r'\1', examples_text.strip(), flags=re.DOTALL)
                        
                        # Ensure each line starts with "- "
                        examples_lines = examples_text.split('\n')
                        examples_text = '\n'.join([
                            line if line.strip().startswith('- ') else f'- {line.strip()}' 
                            for line in examples_lines if line.strip()
                        ])
                        
                        # Mark as literal block style
                        from ruamel.yaml.scalarstring import LiteralScalarString
                        intent["examples"] = LiteralScalarString(examples_text)
                    elif isinstance(intent["examples"], list):
                        # Convert list to properly formatted string
                        examples_text = '\n'.join([f'- {ex}' for ex in intent["examples"]])
                        from ruamel.yaml.scalarstring import LiteralScalarString
                        intent["examples"] = LiteralScalarString(examples_text)
        
        # Explicitly set the style to use block literals for examples
        class BlockLiteralNLUDumper(YAML):
            def represent_scalar(self, tag, value, style=None):
                if tag == 'tag:yaml.org,2002:str' and '\n' in value:
                    style = '|'
                return super().represent_scalar(tag, value, style)
        
        # Write the updated YAML with the correct dumper
        custom_yaml = BlockLiteralNLUDumper()
        custom_yaml.preserve_quotes = False
        custom_yaml.explicit_start = True
        custom_yaml.indent(mapping=2, sequence=4, offset=2)
        
        with open(NLU_PATH, "w") as f:
            custom_yaml.dump(nlu_content, f)
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(500, f"Failed to save: {str(e)}")

@app.post("/train")
def train_model():
    """Trigger Rasa training"""
    try:
        result = subprocess.run(
            ["rasa", "train"],
            cwd=str(RASA_ROOT),
            capture_output=True,
            text=True
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr
        }
    except Exception as e:
        raise HTTPException(500, f"Training failed: {str(e)}")
      
@app.post("/shell")
def rasa_shell():
    """Trigger Rasa Shell"""
    try:
        result = subprocess.run(
            ["rasa", "shell"],
            cwd=str(RASA_ROOT),
            capture_output=True,
            text=True
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr
        }
    except Exception as e:
        raise HTTPException(500, f"Shell failed: {str(e)}")

