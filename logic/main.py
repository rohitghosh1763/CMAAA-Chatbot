
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import subprocess
from pathlib import Path
import os
from ruamel.yaml import YAML
from pydantic import BaseModel
import re
from ruamel.yaml.scalarstring import LiteralScalarString


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to the Rasa files 
RASA_ROOT = Path(__file__).resolve(2).parent
NLU_PATH = RASA_ROOT / "data" / "nlu.yml"
RULES_PATH = RASA_ROOT / "data" / "rules.yml"
STORIES_PATH = RASA_ROOT / "data" / "stories.yml"  # Adding path to stories.yml
DOMAIN_PATH = RASA_ROOT / "domain.yml"  # Adding path to domain.yml

class YAMLContent(BaseModel):
    content: dict  # Dictionary structure from the frontend

@app.get("/")
async def root():
    return {"message": "Admin panel API is running!"}

@app.get("/nlu")
def get_nlu():
    """Read current nlu.yml content"""
    if not NLU_PATH.exists():
        raise HTTPException(404, "nlu.yml not found")
    
    # Reading the file directly to preserve formatting
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
def update_nlu(nlu_data: YAMLContent):
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

@app.get("/rules")
def get_rules():
    """Read current rules.yml content"""
    if not RULES_PATH.exists():
        raise HTTPException(404, "rules.yml not found")
    
    # Parse with ruamel.yaml to get structured data
    yaml = YAML()
    yaml.preserve_quotes = False
    yaml.explicit_start = True
    
    # Load the YAML content
    with open(RULES_PATH, "r") as f:
        parsed_content = yaml.load(f)
    
    return {"content": parsed_content}

@app.post("/rules")
def update_rules(rules_data: YAMLContent):
    """Save edits to rules.yml with proper formatting"""
    try:
        # Create a custom YAML handler
        yaml = YAML()
        yaml.preserve_quotes = False
        yaml.explicit_start = True
        yaml.indent(mapping=2, sequence=4, offset=2)
        
        rules_content = rules_data.content
        
        # Format the steps properly for each rule
        if "rules" in rules_content:
            for rule in rules_content["rules"]:
                if "steps" in rule and isinstance(rule["steps"], list):
                    # Ensure each step is properly formatted
                    formatted_steps = []
                    for step in rule["steps"]:
                        if isinstance(step, str):
                            # This shouldn't happen, but handle just in case
                            step_parts = step.split(": ")
                            if len(step_parts) == 2:
                                formatted_steps.append({step_parts[0].strip(): step_parts[1].strip()})
                            else:
                                formatted_steps.append(step)
                        else:
                            formatted_steps.append(step)
                    rule["steps"] = formatted_steps
        
        # Write the updated YAML
        with open(RULES_PATH, "w") as f:
            yaml.dump(rules_content, f)
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(500, f"Failed to save rules: {str(e)}")

@app.get("/stories")
def get_stories():
    """Read current stories.yml content"""
    if not STORIES_PATH.exists():
        raise HTTPException(404, "stories.yml not found")
    
    # Parse with ruamel.yaml to get structured data
    yaml = YAML()
    yaml.preserve_quotes = False
    yaml.explicit_start = True
    
    # Load the YAML content
    with open(STORIES_PATH, "r") as f:
        parsed_content = yaml.load(f)
    
    return {"content": parsed_content}

@app.post("/stories")
def update_stories(stories_data: YAMLContent):
    """Save edits to stories.yml with proper formatting"""
    try:
        # Create a custom YAML handler
        yaml = YAML()
        yaml.preserve_quotes = False
        yaml.explicit_start = True
        yaml.indent(mapping=2, sequence=4, offset=2)
        
        stories_content = stories_data.content
        
        # Format the steps properly for each story
        if "stories" in stories_content:
            for story in stories_content["stories"]:
                if "steps" in story and isinstance(story["steps"], list):
                    # Ensure each step is properly formatted
                    formatted_steps = []
                    for step in story["steps"]:
                        if isinstance(step, str):
                            # This shouldn't happen, but handle just in case
                            step_parts = step.split(": ")
                            if len(step_parts) == 2:
                                formatted_steps.append({step_parts[0].strip(): step_parts[1].strip()})
                            else:
                                formatted_steps.append(step)
                        else:
                            formatted_steps.append(step)
                    story["steps"] = formatted_steps
        
        # Write the updated YAML
        with open(STORIES_PATH, "w") as f:
            yaml.dump(stories_content, f)
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(500, f"Failed to save stories: {str(e)}")

@app.get("/domain")
def get_domain():
    """Read current domain.yml content"""
    if not DOMAIN_PATH.exists():
        raise HTTPException(404, "domain.yml not found")
    
    # Parse with ruamel.yaml to get structured data
    yaml = YAML()
    yaml.preserve_quotes = False
    yaml.explicit_start = True
    
    # Load the YAML content
    with open(DOMAIN_PATH, "r") as f:
        parsed_content = yaml.load(f)
    
    return {"content": parsed_content}

@app.post("/domain")
def update_domain(domain_data: YAMLContent):
    """Save edits to domain.yml with proper formatting"""
    try:
        # Create a custom YAML handler
        yaml = YAML()
        yaml.preserve_quotes = False
        yaml.explicit_start = True
        yaml.indent(mapping=2, sequence=4, offset=2)
        
        domain_content = domain_data.content
        
        # Format response templates properly
        if "responses" in domain_content:
            for response_key, response_values in domain_content["responses"].items():
                if isinstance(response_values, list):
                    for i, response in enumerate(response_values):
                        # Handle text responses with special formatting
                        if "text" in response and isinstance(response["text"], str) and "\n" in response["text"]:
                            from ruamel.yaml.scalarstring import LiteralScalarString
                            response["text"] = LiteralScalarString(response["text"])
        
        # Write the updated YAML
        with open(DOMAIN_PATH, "w") as f:
            yaml.dump(domain_content, f)
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(500, f"Failed to save domain: {str(e)}")

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

# from fastapi import FastAPI, HTTPException, Body
# from fastapi.middleware.cors import CORSMiddleware
# import subprocess
# from pathlib import Path
# import os
# from ruamel.yaml import YAML
# from pydantic import BaseModel
# import re

# app = FastAPI()


# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Path to the Rasa files 
# RASA_ROOT = Path(os.getenv("RASA_PATH", "../../logic"))  # Goes up to your-rasa-project/
# NLU_PATH = RASA_ROOT / "data" / "nlu.yml"
# RULES_PATH = RASA_ROOT / "data" / "rules.yml"
# STORIES_PATH = RASA_ROOT / "data" / "stories.yml"  # Adding path to stories.yml

# class YAMLContent(BaseModel):
#     content: dict  # Dictionary structure from the frontend

# @app.get("/")
# async def root():
#     return {"message": "Admin panel API is running!"}

# @app.get("/nlu")
# def get_nlu():
#     """Read current nlu.yml content"""
#     if not NLU_PATH.exists():
#         raise HTTPException(404, "nlu.yml not found")
    
#     # Reading the file directly to preserve formatting
#     with open(NLU_PATH, "r") as f:
#         raw_yaml = f.read()
    
#     # Parse with ruamel.yaml to get structured data
#     yaml = YAML()
#     yaml.preserve_quotes = False
#     yaml.explicit_start = True
    
#     # Load the YAML content
#     with open(NLU_PATH, "r") as f:
#         parsed_content = yaml.load(f)
    
#     return {"content": parsed_content}

# @app.post("/nlu")
# def update_nlu(nlu_data: YAMLContent):
#     """Save edits to nlu.yml with proper formatting"""
#     try:
#         # Create a custom YAML handler
#         yaml = YAML()
#         yaml.preserve_quotes = False
#         yaml.explicit_start = True
#         yaml.indent(mapping=2, sequence=4, offset=2)
        
#         # Process the examples to ensure they use literal block format
#         nlu_content = nlu_data.content
#         if "nlu" in nlu_content:
#             for intent in nlu_content["nlu"]:
#                 if "examples" in intent:
#                     # Ensure examples has the proper block literal format
#                     if isinstance(intent["examples"], str):
#                         # Clean the string - remove any existing formatting artifacts
#                         examples_text = intent["examples"]
#                         # Remove quotes and escaped newlines if present
#                         examples_text = examples_text.replace('\\n', '\n')
#                         examples_text = re.sub(r'^["\'](.*)["\']$', r'\1', examples_text.strip(), flags=re.DOTALL)
                        
#                         # Ensure each line starts with "- "
#                         examples_lines = examples_text.split('\n')
#                         examples_text = '\n'.join([
#                             line if line.strip().startswith('- ') else f'- {line.strip()}' 
#                             for line in examples_lines if line.strip()
#                         ])
                        
#                         # Mark as literal block style
#                         from ruamel.yaml.scalarstring import LiteralScalarString
#                         intent["examples"] = LiteralScalarString(examples_text)
#                     elif isinstance(intent["examples"], list):
#                         # Convert list to properly formatted string
#                         examples_text = '\n'.join([f'- {ex}' for ex in intent["examples"]])
#                         from ruamel.yaml.scalarstring import LiteralScalarString
#                         intent["examples"] = LiteralScalarString(examples_text)
        
#         # Explicitly set the style to use block literals for examples
#         class BlockLiteralNLUDumper(YAML):
#             def represent_scalar(self, tag, value, style=None):
#                 if tag == 'tag:yaml.org,2002:str' and '\n' in value:
#                     style = '|'
#                 return super().represent_scalar(tag, value, style)
        
#         # Write the updated YAML with the correct dumper
#         custom_yaml = BlockLiteralNLUDumper()
#         custom_yaml.preserve_quotes = False
#         custom_yaml.explicit_start = True
#         custom_yaml.indent(mapping=2, sequence=4, offset=2)
        
#         with open(NLU_PATH, "w") as f:
#             custom_yaml.dump(nlu_content, f)
        
#         return {"success": True}
#     except Exception as e:
#         raise HTTPException(500, f"Failed to save: {str(e)}")

# @app.get("/rules")
# def get_rules():
#     """Read current rules.yml content"""
#     if not RULES_PATH.exists():
#         raise HTTPException(404, "rules.yml not found")
    
#     # Parse with ruamel.yaml to get structured data
#     yaml = YAML()
#     yaml.preserve_quotes = False
#     yaml.explicit_start = True
    
#     # Load the YAML content
#     with open(RULES_PATH, "r") as f:
#         parsed_content = yaml.load(f)
    
#     return {"content": parsed_content}

# @app.post("/rules")
# def update_rules(rules_data: YAMLContent):
#     """Save edits to rules.yml with proper formatting"""
#     try:
#         # Create a custom YAML handler
#         yaml = YAML()
#         yaml.preserve_quotes = False
#         yaml.explicit_start = True
#         yaml.indent(mapping=2, sequence=4, offset=2)
        
#         rules_content = rules_data.content
        
#         # Format the steps properly for each rule
#         if "rules" in rules_content:
#             for rule in rules_content["rules"]:
#                 if "steps" in rule and isinstance(rule["steps"], list):
#                     # Ensure each step is properly formatted
#                     formatted_steps = []
#                     for step in rule["steps"]:
#                         if isinstance(step, str):
#                             # This shouldn't happen, but handle just in case
#                             step_parts = step.split(": ")
#                             if len(step_parts) == 2:
#                                 formatted_steps.append({step_parts[0].strip(): step_parts[1].strip()})
#                             else:
#                                 formatted_steps.append(step)
#                         else:
#                             formatted_steps.append(step)
#                     rule["steps"] = formatted_steps
        
#         # Write the updated YAML
#         with open(RULES_PATH, "w") as f:
#             yaml.dump(rules_content, f)
        
#         return {"success": True}
#     except Exception as e:
#         raise HTTPException(500, f"Failed to save rules: {str(e)}")

# @app.get("/stories")
# def get_stories():
#     """Read current stories.yml content"""
#     if not STORIES_PATH.exists():
#         raise HTTPException(404, "stories.yml not found")
    
#     # Parse with ruamel.yaml to get structured data
#     yaml = YAML()
#     yaml.preserve_quotes = False
#     yaml.explicit_start = True
    
#     # Load the YAML content
#     with open(STORIES_PATH, "r") as f:
#         parsed_content = yaml.load(f)
    
#     return {"content": parsed_content}

# @app.post("/stories")
# def update_stories(stories_data: YAMLContent):
#     """Save edits to stories.yml with proper formatting"""
#     try:
#         # Create a custom YAML handler
#         yaml = YAML()
#         yaml.preserve_quotes = False
#         yaml.explicit_start = True
#         yaml.indent(mapping=2, sequence=4, offset=2)
        
#         stories_content = stories_data.content
        
#         # Format the steps properly for each story
#         if "stories" in stories_content:
#             for story in stories_content["stories"]:
#                 if "steps" in story and isinstance(story["steps"], list):
#                     # Ensure each step is properly formatted
#                     formatted_steps = []
#                     for step in story["steps"]:
#                         if isinstance(step, str):
#                             # This shouldn't happen, but handle just in case
#                             step_parts = step.split(": ")
#                             if len(step_parts) == 2:
#                                 formatted_steps.append({step_parts[0].strip(): step_parts[1].strip()})
#                             else:
#                                 formatted_steps.append(step)
#                         else:
#                             formatted_steps.append(step)
#                     story["steps"] = formatted_steps
        
#         # Write the updated YAML
#         with open(STORIES_PATH, "w") as f:
#             yaml.dump(stories_content, f)
        
#         return {"success": True}
#     except Exception as e:
#         raise HTTPException(500, f"Failed to save stories: {str(e)}")

# @app.post("/train")
# def train_model():
#     """Trigger Rasa training"""
#     try:
#         result = subprocess.run(
#             ["rasa", "train"],
#             cwd=str(RASA_ROOT),
#             capture_output=True,
#             text=True
#         )
#         return {
#             "success": result.returncode == 0,
#             "output": result.stdout,
#             "error": result.stderr
#         }
#     except Exception as e:
#         raise HTTPException(500, f"Training failed: {str(e)}")
      
# @app.post("/shell")
# def rasa_shell():
#     """Trigger Rasa Shell"""
#     try:
#         result = subprocess.run(
#             ["rasa", "shell"],
#             cwd=str(RASA_ROOT),
#             capture_output=True,
#             text=True
#         )
#         return {
#             "success": result.returncode == 0,
#             "output": result.stdout,
#             "error": result.stderr
#         }
#     except Exception as e:
#         raise HTTPException(500, f"Shell failed: {str(e)}")

