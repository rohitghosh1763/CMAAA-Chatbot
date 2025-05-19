from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import subprocess
from pathlib import Path
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import LiteralScalarString
from pydantic import BaseModel
import re
import logging
import os # Added for environment variable fallback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# --- Path Definitions ---
# main.py is in D:\Coding\CMAAA-Chatbot\interface\backend\main.py
# Rasa project files (domain.yml, data folder) are in D:\Coding\CMAAA-Chatbot\logic\
try:
    # RASA_ROOT should point to D:\Coding\CMAAA-Chatbot\logic
    # Path(__file__).resolve().parent is D:\Coding\CMAAA-Chatbot\interface\backend
    SCRIPT_DIR = Path(__file__).resolve().parent
    # Corrected: .parent.parent takes us to D:\Coding\CMAAA-Chatbot
    RASA_PROJECT_BASE = SCRIPT_DIR.parent.parent
    RASA_ROOT = RASA_PROJECT_BASE / "rasa" # This should now be D:\Coding\CMAAA-Chatbot\logic

except NameError:
    # Fallback for environments where __file__ is not defined
    logger.warning("__file__ not defined. Attempting to set RASA_ROOT based on environment variable or hardcoded path.")
    # Option 1: Use an environment variable
    rasa_project_logic_path_env = os.environ.get("RASA_PROJECT_LOGIC_PATH")
    if rasa_project_logic_path_env:
        RASA_ROOT = Path(rasa_project_logic_path_env)
        logger.info(f"RASA_ROOT set from RASA_PROJECT_LOGIC_PATH environment variable: {RASA_ROOT}")
    else:
        # Option 2: Hardcode as a last resort (Update this path if necessary)
        # This is less flexible and should ideally be avoided.
        hardcoded_path = Path("D:/Coding/CMAAA-Chatbot/logic") # Ensure this is correct for your system
        if hardcoded_path.exists() and (hardcoded_path / "domain.yml").exists():
            RASA_ROOT = hardcoded_path
            logger.warning(f"RASA_ROOT hardcoded to: {RASA_ROOT}. Consider using __file__ or environment variable.")
        else:
            logger.error(f"Could not automatically determine RASA_ROOT. Hardcoded path {hardcoded_path} also seems invalid. Please check path definitions.")
            # Critical error, application might not function correctly.
            # You might want to raise an exception here or ensure RASA_ROOT is valid.
            RASA_ROOT = Path(".") # Defaulting to current directory, likely incorrect.


DATA_DIR = RASA_ROOT / "data"
NLU_PATH = DATA_DIR / "nlu.yml"
RULES_PATH = DATA_DIR / "rules.yml"
STORIES_PATH = DATA_DIR / "stories.yml"
DOMAIN_PATH = RASA_ROOT / "domain.yml" # domain.yml is directly in the 'logic' folder

# Log resolved paths at startup for easier debugging
logger.info(f"Script directory: {SCRIPT_DIR if '__file__' in locals() or '__file__' in globals() else 'N/A (__file__ not defined)'}")
logger.info(f"RASA_PROJECT_BASE (intended D:\\Coding\\CMAAA-Chatbot) resolved to: {RASA_PROJECT_BASE if 'RASA_PROJECT_BASE' in locals() else 'N/A (likely due to __file__ issue)'}")
logger.info(f"RASA_ROOT (intended D:\\Coding\\CMAAA-Chatbot\\rasa) resolved to: {RASA_ROOT}")
logger.info(f"Data directory targeted at: {DATA_DIR}")
logger.info(f"NLU file targeted at: {NLU_PATH}")
logger.info(f"Rules file targeted at: {RULES_PATH}")
logger.info(f"Stories file targeted at: {STORIES_PATH}")
logger.info(f"Domain file targeted at: {DOMAIN_PATH}")


class YAMLContent(BaseModel):
    content: dict  # Expecting a dictionary structure from the frontend


# --- Helper function to ensure data directory exists ---
def ensure_data_directory():
    """Ensures that the RASA 'data' directory exists, creating it if necessary."""
    if not RASA_ROOT.exists():
        logger.error(f"RASA_ROOT directory {RASA_ROOT} does not exist. Cannot create data directory.")
        raise HTTPException(status_code=500, detail=f"Server configuration error: RASA_ROOT {RASA_ROOT} not found.")
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"Ensured data directory exists at: {DATA_DIR}")
    except Exception as e:
        logger.error(f"Could not create or access data directory {DATA_DIR}: {e}")
        raise HTTPException(status_code=500, detail=f"Server error: Could not ensure data directory {DATA_DIR}")


@app.get("/")
async def root():
    return {"message": "Admin panel API is running!"}

# --- NLU Endpoints ---
@app.get("/nlu")
def get_nlu():
    """Read current nlu.yml content."""
    if not DATA_DIR.exists():
        logger.warning(f"Data directory not found at {DATA_DIR} when trying to read NLU file.")
        raise HTTPException(status_code=404, detail=f"Data directory '{DATA_DIR.name}' (expected at {DATA_DIR}) not found.")
    if not NLU_PATH.exists():
        logger.warning(f"nlu.yml not found at {NLU_PATH}.")
        raise HTTPException(status_code=404, detail=f"nlu.yml not found in data directory (expected at {NLU_PATH}).")
    
    yaml = YAML()
    yaml.preserve_quotes = False 
    yaml.explicit_start = True
    
    try:
        with open(NLU_PATH, "r", encoding="utf-8") as f:
            parsed_content = yaml.load(f)
        return {"content": parsed_content}
    except Exception as e:
        logger.error(f"Error reading or parsing nlu.yml from {NLU_PATH}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not read or parse nlu.yml: {e}")

@app.post("/nlu")
def update_nlu(nlu_data: YAMLContent):
    """Save edits to nlu.yml with proper formatting."""
    ensure_data_directory() 
    
    try:
        yaml_handler = YAML()
        yaml_handler.preserve_quotes = False
        yaml_handler.explicit_start = True
        yaml_handler.indent(mapping=2, sequence=4, offset=2)
        
        nlu_content = nlu_data.content
        if "nlu" in nlu_content and isinstance(nlu_content.get("nlu"), list): # Added check for list
            for item in nlu_content["nlu"]: 
                if isinstance(item, dict) and "examples" in item: # Added check for item being a dict
                    examples_text = item["examples"]
                    if isinstance(examples_text, str):
                        examples_text = examples_text.replace('\\n', '\n')
                        # Ensure examples_text is treated as a block literal
                        examples_text = re.sub(r'^["\'](.*)["\']$', r'\1', examples_text.strip(), flags=re.DOTALL)
                        
                        examples_lines = [line.strip() for line in examples_text.split('\n') if line.strip()]
                        processed_lines = []
                        for line in examples_lines:
                            # Ensure each line starts with '- ' unless it's empty or already formatted
                            if line and not line.startswith('- '):
                                processed_lines.append(f"- {line}")
                            elif line: # if it already starts with '- ' or is just '-'
                                processed_lines.append(line)
                        
                        item["examples"] = LiteralScalarString('\n'.join(processed_lines))
                    elif isinstance(examples_text, list):
                        # Convert list to properly formatted string for LiteralScalarString
                        processed_list_examples = []
                        for ex_item in examples_text:
                            ex_str = str(ex_item).strip()
                            if ex_str and not ex_str.startswith('- '):
                                processed_list_examples.append(f'- {ex_str}')
                            elif ex_str:
                                processed_list_examples.append(ex_str)
                        item["examples"] = LiteralScalarString('\n'.join(processed_list_examples))
        
        with open(NLU_PATH, "w", encoding="utf-8") as f:
            yaml_handler.dump(nlu_content, f)
        
        return {"success": True, "message": f"nlu.yml updated successfully at {NLU_PATH}."}
    except Exception as e:
        logger.error(f"Failed to save nlu.yml to {NLU_PATH}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save nlu.yml: {str(e)}")

# --- Rules Endpoints ---
@app.get("/rules")
def get_rules():
    """Read current rules.yml content."""
    if not DATA_DIR.exists():
        logger.warning(f"Data directory not found at {DATA_DIR} when trying to read rules file.")
        raise HTTPException(status_code=404, detail=f"Data directory '{DATA_DIR.name}' (expected at {DATA_DIR}) not found.")
    if not RULES_PATH.exists():
        logger.warning(f"rules.yml not found at {RULES_PATH}.")
        raise HTTPException(status_code=404, detail=f"rules.yml not found in data directory (expected at {RULES_PATH}).")
        
    yaml = YAML()
    yaml.preserve_quotes = False
    yaml.explicit_start = True
    
    try:
        with open(RULES_PATH, "r", encoding="utf-8") as f:
            parsed_content = yaml.load(f)
        return {"content": parsed_content}
    except Exception as e:
        logger.error(f"Error reading or parsing rules.yml from {RULES_PATH}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not read or parse rules.yml: {e}")

@app.post("/rules")
def update_rules(rules_data: YAMLContent):
    """Save edits to rules.yml with proper formatting."""
    ensure_data_directory()

    try:
        yaml_handler = YAML()
        yaml_handler.preserve_quotes = False
        yaml_handler.explicit_start = True
        yaml_handler.indent(mapping=2, sequence=4, offset=2)
        
        rules_content = rules_data.content
        
        if "rules" in rules_content and isinstance(rules_content.get("rules"), list):
            for rule in rules_content["rules"]:
                if isinstance(rule, dict) and "steps" in rule and isinstance(rule.get("steps"), list):
                    formatted_steps = []
                    for step in rule["steps"]:
                        if isinstance(step, str): 
                            # Handle cases like "- intent: greet" or "action: utter_greet"
                            if step.startswith("- "): # Properly handle list items that are strings
                                parts = step.lstrip("- ").split(":", 1)
                            else:
                                parts = step.split(":", 1) 

                            if len(parts) == 2:
                                formatted_steps.append({parts[0].strip(): parts[1].strip()})
                            else: # If it's just a string like "- action_xyz" without a colon
                                if step.startswith("- "):
                                     formatted_steps.append(step.lstrip("- ").strip()) # Or handle as error/specific format
                                else:
                                     formatted_steps.append(step.strip())

                        elif isinstance(step, dict): # If step is already a dictionary
                             formatted_steps.append(step) 
                        # else: # Handle other unexpected step types if necessary
                        #    formatted_steps.append(str(step))
                    rule["steps"] = formatted_steps
        
        with open(RULES_PATH, "w", encoding="utf-8") as f:
            yaml_handler.dump(rules_content, f)
            
        return {"success": True, "message": f"rules.yml updated successfully at {RULES_PATH}."}
    except Exception as e:
        logger.error(f"Failed to save rules.yml to {RULES_PATH}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save rules.yml: {str(e)}")

# --- Stories Endpoints ---
@app.get("/stories")
def get_stories():
    """Read current stories.yml content."""
    if not DATA_DIR.exists():
        logger.warning(f"Data directory not found at {DATA_DIR} when trying to read stories file.")
        raise HTTPException(status_code=404, detail=f"Data directory '{DATA_DIR.name}' (expected at {DATA_DIR}) not found.")
    if not STORIES_PATH.exists():
        logger.warning(f"stories.yml not found at {STORIES_PATH}.")
        raise HTTPException(status_code=404, detail=f"stories.yml not found in data directory (expected at {STORIES_PATH}).")

    yaml = YAML()
    yaml.preserve_quotes = False
    yaml.explicit_start = True
    
    try:
        with open(STORIES_PATH, "r", encoding="utf-8") as f:
            parsed_content = yaml.load(f)
        return {"content": parsed_content}
    except Exception as e:
        logger.error(f"Error reading or parsing stories.yml from {STORIES_PATH}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not read or parse stories.yml: {e}")

@app.post("/stories")
def update_stories(stories_data: YAMLContent):
    """Save edits to stories.yml with proper formatting."""
    ensure_data_directory()

    try:
        yaml_handler = YAML()
        yaml_handler.preserve_quotes = False
        yaml_handler.explicit_start = True
        yaml_handler.indent(mapping=2, sequence=4, offset=2)
        
        stories_content = stories_data.content

        if "stories" in stories_content and isinstance(stories_content.get("stories"), list):
            for story in stories_content["stories"]:
                if isinstance(story, dict) and "steps" in story and isinstance(story.get("steps"), list):
                    formatted_steps = []
                    for step in story["steps"]:
                        if isinstance(step, str): 
                            if step.startswith("- "): 
                                parts = step.lstrip("- ").split(":", 1)
                            else:
                                parts = step.split(":", 1)

                            if len(parts) == 2:
                                formatted_steps.append({parts[0].strip(): parts[1].strip()})
                            else:
                                if step.startswith("- "):
                                     formatted_steps.append(step.lstrip("- ").strip())
                                else:
                                     formatted_steps.append(step.strip())
                        elif isinstance(step, dict):
                            formatted_steps.append(step)
                    story["steps"] = formatted_steps

        with open(STORIES_PATH, "w", encoding="utf-8") as f:
            yaml_handler.dump(stories_content, f)
            
        return {"success": True, "message": f"stories.yml updated successfully at {STORIES_PATH}."}
    except Exception as e:
        logger.error(f"Failed to save stories.yml to {STORIES_PATH}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save stories.yml: {str(e)}")

# --- Domain Endpoint ---
@app.get("/domain")
def get_domain():
    """Read current domain.yml content."""
    if not DOMAIN_PATH.exists(): 
        logger.warning(f"domain.yml not found at {DOMAIN_PATH}.")
        raise HTTPException(status_code=404, detail=f"domain.yml not found (expected at {DOMAIN_PATH}).")
        
    yaml = YAML()
    yaml.preserve_quotes = False
    yaml.explicit_start = True
    
    try:
        with open(DOMAIN_PATH, "r", encoding="utf-8") as f:
            parsed_content = yaml.load(f)
        return {"content": parsed_content}
    except Exception as e:
        logger.error(f"Error reading or parsing domain.yml from {DOMAIN_PATH}: {e}")
        raise HTTPException(status_code=500, detail=f"Could not read or parse domain.yml: {e}")

@app.post("/domain")
def update_domain(domain_data: YAMLContent):
    """Save edits to domain.yml with proper formatting."""
    if not RASA_ROOT.exists(): 
        logger.error(f"RASA_ROOT directory {RASA_ROOT} for domain.yml does not exist.")
        raise HTTPException(status_code=500, detail=f"Server configuration error: RASA_ROOT {RASA_ROOT} not found.")
    try:
        yaml_handler = YAML()
        yaml_handler.preserve_quotes = False
        yaml_handler.explicit_start = True
        yaml_handler.indent(mapping=2, sequence=4, offset=2)
        
        domain_content = domain_data.content
        
        if "responses" in domain_content and isinstance(domain_content.get("responses"), dict):
            for response_key, response_values_list in domain_content["responses"].items():
                if isinstance(response_values_list, list):
                    for i, response_item in enumerate(response_values_list):
                        if isinstance(response_item, dict) and "text" in response_item:
                            text_content = response_item["text"]
                            if isinstance(text_content, str) and "\n" in text_content:
                                # Ensure it's treated as a literal block and strip leading/trailing whitespace for clean multiline
                                response_item["text"] = LiteralScalarString(text_content.strip())
        
        with open(DOMAIN_PATH, "w", encoding="utf-8") as f:
            yaml_handler.dump(domain_content, f)
            
        return {"success": True, "message": f"domain.yml updated successfully at {DOMAIN_PATH}."}
    except Exception as e:
        logger.error(f"Failed to save domain.yml to {DOMAIN_PATH}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save domain.yml: {str(e)}")

# --- Rasa Actions ---
@app.post("/train")
def train_model():
    """Trigger Rasa training."""
    logger.info(f"Rasa training triggered. CWD for subprocess will be: {RASA_ROOT}")
    if not RASA_ROOT.exists() or not (RASA_ROOT / "config.yml").exists(): 
        logger.error(f"RASA_ROOT {RASA_ROOT} does not appear to be a valid Rasa project directory (missing config.yml or directory itself).")
        raise HTTPException(status_code=500, detail=f"RASA_ROOT ({RASA_ROOT}) is not a valid Rasa project directory.")
    try:
        result = subprocess.run(
            ["rasa", "train"],
            cwd=str(RASA_ROOT), 
            capture_output=True,
            text=True,
            check=False 
        )
        logger.info(f"Rasa train stdout: {result.stdout}")
        if result.stderr:
            logger.error(f"Rasa train stderr: {result.stderr}")
            
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr
        }
    except FileNotFoundError:
        logger.error("Rasa command not found. Is Rasa installed and in PATH?")
        raise HTTPException(status_code=500, detail="Rasa command not found. Ensure Rasa is installed and accessible in the system's PATH.")
    except Exception as e:
        logger.error(f"Rasa training failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Rasa training process failed: {str(e)}")

@app.post("/shell")
def rasa_shell_command():
    """Trigger Rasa Shell (Note: subprocess limitations apply for interactive shells)."""
    logger.info(f"Rasa shell triggered. CWD for subprocess will be: {RASA_ROOT}")
    if not RASA_ROOT.exists() or not (RASA_ROOT / "config.yml").exists(): 
        logger.error(f"RASA_ROOT {RASA_ROOT} does not appear to be a valid Rasa project directory.")
        raise HTTPException(status_code=500, detail=f"RASA_ROOT ({RASA_ROOT}) is not a valid Rasa project directory.")
    try:
        result = subprocess.run(
            ["rasa", "shell", "--no-prompt"], 
            cwd=str(RASA_ROOT),
            capture_output=True,
            text=True,
            timeout=10 
        )
        logger.info(f"Rasa shell stdout: {result.stdout}")
        if result.stderr:
            logger.error(f"Rasa shell stderr: {result.stderr}")

        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr
        }
    except subprocess.TimeoutExpired:
        logger.warning("Rasa shell command timed out.")
        return {
            "success": False,
            "output": "Rasa shell command timed out. This is expected for interactive commands run via subprocess.",
            "error": "Timeout"
        }
    except FileNotFoundError:
        logger.error("Rasa command not found. Is Rasa installed and in PATH?")
        raise HTTPException(status_code=500, detail="Rasa command not found. Ensure Rasa is installed and accessible in the system's PATH.")
    except Exception as e:
        logger.error(f"Rasa shell command failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Rasa shell command failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Uvicorn server for main:app. Effective RASA_ROOT is {RASA_ROOT}")
    # To run this:
    # 1. Navigate to D:\Coding\CMAAA-Chatbot\interface\backend in your terminal
    # 2. Run: uvicorn main:app --reload
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

