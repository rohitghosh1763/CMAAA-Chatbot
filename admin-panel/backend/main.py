from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
import subprocess
from pathlib import Path
from ruamel.yaml import YAML
from ruamel.yaml.scalarstring import LiteralScalarString # For proper multiline string dumping
from pydantic import BaseModel, Field
import re
import logging
import os
from typing import List, Optional, Dict, Any
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from bson import ObjectId
import shutil # For file operations like copy
import asyncio # For asyncio.sleep

import psutil # For process management (Rasa API start/stop)

# --- Logging Configuration ---
# Set to INFO for production, DEBUG for development if needed.
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- FastAPI App Initialization ---
app = FastAPI(title="Rasa Admin Panel API", version="1.0.0")

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins for simplicity, restrict in production
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)

# --- MongoDB Configuration ---
MONGODB_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = "cmaaa" # Your database name
UNKNOWN_QUERIES_COLLECTION = "unknown-queries"
mongo_client: Optional[AsyncIOMotorClient] = None
db: Optional[AsyncIOMotorDatabase] = None

# --- Path Definitions & Constants ---
try:
    SCRIPT_DIR = Path(__file__).resolve().parent
    RASA_PROJECT_BASE = SCRIPT_DIR.parent.parent
    RASA_ROOT = RASA_PROJECT_BASE / "rasa"
except NameError:
    logger.warning("__file__ not defined. Attempting RASA_ROOT from RASA_PROJECT_PATH env var or hardcoded path.")
    rasa_project_path_env = os.environ.get("RASA_PROJECT_PATH")
    if rasa_project_path_env:
        RASA_ROOT = Path(rasa_project_path_env)
    else:
        hardcoded_rasa_path = Path("D:/Coding/CMAAA-Chatbot/rasa") # UPDATE IF NECESSARY
        if hardcoded_rasa_path.exists() and (hardcoded_rasa_path / "config.yml").exists():
            RASA_ROOT = hardcoded_rasa_path
            logger.warning(f"RASA_ROOT hardcoded to: {RASA_ROOT}. This is not recommended for production.")
        else:
            logger.error(f"Critical: RASA_ROOT cannot be determined. Hardcoded path {hardcoded_rasa_path} invalid.")
            RASA_ROOT = Path(".") # Fallback, will likely cause issues

DATA_DIR = RASA_ROOT / "data"
MODELS_DIR = RASA_ROOT / "models"
NLU_PATH = DATA_DIR / "nlu.yml"
RULES_PATH = DATA_DIR / "rules.yml"
STORIES_PATH = DATA_DIR / "stories.yml"
DOMAIN_PATH = RASA_ROOT / "domain.yml"
ACTIVE_MODEL_FILENAME = "active_model.tar.gz"

RASA_LOGS_DIR = RASA_ROOT / "logs"
RASA_API_PID_FILE = RASA_LOGS_DIR / ".rasa_api.pid"
RASA_API_LOG_FILE = RASA_LOGS_DIR / "rasa_api.log"
RASA_API_PORT = 5005

# --- Pydantic Models ---
class YAMLContent(BaseModel):
    content: Dict[str, Any]

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls): yield cls.validate
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v): raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    @classmethod
    def __modify_schema__(cls, field_schema): field_schema.update(type="string")

class UnknownQueryBase(BaseModel):
    query: str
    timestamp: datetime = Field(default_factory=datetime.now)
    intent_ranking: List[Dict[str, Any]] = Field(default_factory=list)

class UnknownQueryDB(UnknownQueryBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    class Config: allow_population_by_field_name = True; arbitrary_types_allowed = True; json_encoders = {ObjectId: str}

class UnknownQueryCreate(UnknownQueryBase): pass

class UnknownQueryResponse(UnknownQueryBase):
    id: str
    class Config: allow_population_by_field_name = True; arbitrary_types_allowed = True

class ModelInfo(BaseModel):
    name: str
    created_at: datetime
    size_mb: float
    is_active: bool

class RasaStatusResponse(BaseModel):
    status: str
    message: Optional[str] = None
    pid: Optional[int] = None
    model_name: Optional[str] = None
    port: Optional[int] = None
    log_file: Optional[str] = None

# --- Database Connection ---
async def get_database() -> AsyncIOMotorDatabase:
    global mongo_client, db
    if db is None:
        try:
            logger.info(f"Attempting to connect to MongoDB at {MONGODB_URL}...")
            mongo_client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=5000)
            await mongo_client.admin.command('ping')
            db = mongo_client[DB_NAME]
            logger.info(f"Successfully connected to MongoDB, database: '{DB_NAME}'.")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}", exc_info=True)
            mongo_client = None
            db = None
    if db is None:
        raise HTTPException(status_code=503, detail="Database not available. Connection failed or not established.")
    return db

# --- Directory and File Helpers ---
def ensure_directory(dir_path: Path, dir_name: str):
    if RASA_ROOT == Path(".") and not RASA_ROOT.resolve().exists():
         logger.error(f"RASA_ROOT ('{RASA_ROOT.resolve()}') does not exist. Cannot create '{dir_name}' at '{dir_path}'.")
         raise RuntimeError(f"RASA_ROOT ('{RASA_ROOT.resolve()}') is invalid. Application cannot proceed.")
    try:
        dir_path.mkdir(parents=True, exist_ok=True)
        logger.info(f"Ensured '{dir_name}' directory exists at: {dir_path}")
    except Exception as e:
        logger.error(f"Could not create/access '{dir_name}' directory '{dir_path}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Server error: Could not ensure '{dir_name}' directory.")

def get_model_creation_time_from_name(model_path: Path) -> datetime:
    try:
        name_part = model_path.stem
        if '-' in name_part:
             timestamp_str = name_part.split('-', 2)[:2]
             timestamp_str = '-'.join(timestamp_str)
        else:
            timestamp_str = name_part
        return datetime.strptime(timestamp_str, "%Y%m%d-%H%M%S")
    except ValueError:
        logger.warning(f"Could not parse timestamp from model name '{model_path.name}'. Falling back to file modification time.")
        return datetime.fromtimestamp(model_path.stat().st_mtime)

# --- FastAPI Event Handlers ---
@app.on_event("startup")
async def startup_event_handler():
    logger.info("FastAPI application startup...")
    logger.info(f"Resolved RASA_ROOT: {RASA_ROOT.resolve()}")
    ensure_directory(RASA_ROOT, "Rasa Project Root")
    ensure_directory(DATA_DIR, "Rasa Data")
    ensure_directory(MODELS_DIR, "Rasa Models")
    ensure_directory(RASA_LOGS_DIR, "Rasa Logs")
    await get_database()

@app.on_event("shutdown")
async def shutdown_event_handler():
    global mongo_client
    if mongo_client:
        mongo_client.close()
        logger.info("MongoDB connection closed.")
    logger.info("FastAPI application shutdown.")

# --- Root Endpoint ---
@app.get("/", summary="Root endpoint to check API status", include_in_schema=False) # Hide from OpenAPI docs if it's just a health check
async def root():
    return {"message": "Rasa Admin Panel API is running!"}

# --- Unknown Queries Endpoints ---
@app.post("/unknown-queries", response_model=UnknownQueryResponse, status_code=201, summary="Log a new unknown query")
async def create_unknown_query(query: UnknownQueryCreate, db_conn: AsyncIOMotorDatabase = Depends(get_database)):
    try:
        collection = db_conn[UNKNOWN_QUERIES_COLLECTION]
        query_dict = query.dict(exclude_unset=True)
        result = await collection.insert_one(query_dict)
        created_query_doc = await collection.find_one({"_id": result.inserted_id})
        if created_query_doc:
            return UnknownQueryResponse(id=str(created_query_doc["_id"]), **created_query_doc)
        # This case should ideally not be reached if insert_one succeeds and find_one uses the same ID.
        logger.error(f"Failed to retrieve unknown query record after insertion with ID: {result.inserted_id}")
        raise HTTPException(status_code=500, detail="Failed to create or retrieve unknown query record after insertion.")
    except Exception as e:
        logger.error(f"Error creating unknown query record: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error while creating unknown query: {str(e)}")

@app.get("/unknown-queries", response_model=List[UnknownQueryResponse], summary="List unknown queries")
async def get_unknown_queries(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=1000), db_conn: AsyncIOMotorDatabase = Depends(get_database)):
    try:
        collection = db_conn[UNKNOWN_QUERIES_COLLECTION]
        queries_cursor = collection.find().skip(skip).limit(limit).sort("timestamp", -1)
        results = []
        async for doc in queries_cursor:
            try:
                # Defensive check, though _id should always exist for MongoDB documents
                if "_id" not in doc:
                    logger.warning(f"Document missing '_id' in get_unknown_queries, skipping: {doc.get('query', 'N/A')}")
                    continue
                results.append(UnknownQueryResponse(id=str(doc["_id"]), **doc))
            except Exception as e_doc: # Catch errors during processing of a single document
                logger.error(f"Error processing document {doc.get('_id', 'UNKNOWN_ID')} in get_unknown_queries: {e_doc}", exc_info=True)
                # Skip problematic document, consider if partial results are acceptable
                continue
        return results
    except Exception as e:
        logger.error(f"Error retrieving unknown queries: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error while retrieving unknown queries: {str(e)}")

@app.get("/unknown-queries/search/", response_model=List[UnknownQueryResponse], summary="Search unknown queries")
async def search_unknown_queries(
    query_text: Optional[str] = Query(None, description="Search for queries containing this text (case-insensitive substring match)"),
    date_from: Optional[datetime] = Query(None, description="Filter queries from this date (ISO format, e.g., قومي-MM-DDTHH:MM:SS)"),
    date_to: Optional[datetime] = Query(None, description="Filter queries to this date (ISO format, e.g., قومي-MM-DDTHH:MM:SS)"),
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    db_conn: AsyncIOMotorDatabase = Depends(get_database)
):
    try:
        collection = db_conn[UNKNOWN_QUERIES_COLLECTION]
        filter_conditions: Dict[str, Any] = {}

        if query_text:
            filter_conditions["query"] = {"$regex": query_text, "$options": "i"}

        date_filter: Dict[str, datetime] = {}
        if date_from:
            date_filter["$gte"] = date_from
        if date_to:
            date_filter["$lte"] = date_to

        if date_filter:
            filter_conditions["timestamp"] = date_filter

        logger.info(f"Searching unknown queries with filter: {filter_conditions}, skip: {skip}, limit: {limit}")
        queries_cursor = collection.find(filter_conditions).skip(skip).limit(limit).sort("timestamp", -1)

        results = []
        async for doc in queries_cursor:
            try:
                if "_id" not in doc:
                    logger.warning(f"Document missing '_id' in search, skipping: {doc.get('query', 'N/A')}")
                    continue
                # Ensure defaults for potentially missing fields in older docs before Pydantic validation
                doc.setdefault('query', 'Unknown Query Text') # Should match Pydantic model's expectations
                doc.setdefault('timestamp', datetime.now())   # Or handle as truly optional in model
                doc.setdefault('intent_ranking', [])          # Already has default_factory in model

                results.append(UnknownQueryResponse(id=str(doc["_id"]), **doc))
            except Exception as e_doc:
                logger.error(f"Error processing document {doc.get('_id', 'UNKNOWN_ID')} in search: {e_doc}", exc_info=True)
                continue # Skip problematic document
        return results
    except Exception as e: # General catch-all for the endpoint
        logger.error(f"Error in search_unknown_queries endpoint: {e}", exc_info=True)
        # Provide a generic error message to the client for 500s
        raise HTTPException(status_code=500, detail="An error occurred while searching unknown queries. Please check server logs.")


@app.get("/unknown-queries/{query_id}", response_model=UnknownQueryResponse, summary="Get a specific unknown query by ID")
async def get_unknown_query_by_id(query_id: str, db_conn: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(query_id):
        raise HTTPException(status_code=400, detail=f"Invalid query ID format: {query_id}")
    try:
        collection = db_conn[UNKNOWN_QUERIES_COLLECTION]
        query_doc = await collection.find_one({"_id": ObjectId(query_id)})
        if not query_doc:
            raise HTTPException(status_code=404, detail=f"Unknown query with ID {query_id} not found")
        return UnknownQueryResponse(id=str(query_doc["_id"]), **query_doc)
    except HTTPException: # Re-raise HTTPExceptions directly
        raise
    except Exception as e: # Catch other exceptions
        logger.error(f"Error retrieving unknown query {query_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error retrieving query {query_id}: {str(e)}")

@app.delete("/unknown-queries/{query_id}", status_code=204, summary="Delete an unknown query by ID")
async def delete_unknown_query_by_id(query_id: str, db_conn: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(query_id):
        raise HTTPException(status_code=400, detail=f"Invalid query ID format: {query_id}")
    try:
        collection = db_conn[UNKNOWN_QUERIES_COLLECTION]
        result = await collection.delete_one({"_id": ObjectId(query_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"Unknown query with ID {query_id} not found for deletion.")
        # No content (None) is returned by FastAPI for 204
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting unknown query {query_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Database error deleting query {query_id}: {str(e)}")

# --- Model Management Endpoints ---
@app.get("/models", response_model=List[ModelInfo], summary="List available Rasa models")
async def list_rasa_models():
    ensure_directory(MODELS_DIR, "Rasa Models")
    models_info = []
    active_model_source_file = MODELS_DIR / ".active_model_source"
    current_active_original_model_name = None

    if active_model_source_file.exists():
        try:
            current_active_original_model_name = active_model_source_file.read_text().strip()
        except Exception as e:
            logger.error(f"Error reading active model source file: {e}", exc_info=True)

    model_files = [p for p in MODELS_DIR.glob("*.tar.gz") if p.name != ACTIVE_MODEL_FILENAME]

    for model_file_path in model_files:
        try:
            models_info.append(ModelInfo(
                name=model_file_path.name,
                created_at=get_model_creation_time_from_name(model_file_path),
                size_mb=round(model_file_path.stat().st_size / (1024 * 1024), 2),
                is_active=(model_file_path.name == current_active_original_model_name)
            ))
        except Exception as e: # Catch error if a specific model file has issues (e.g., stat fails)
            logger.error(f"Error processing model file {model_file_path.name}: {e}", exc_info=True)
    models_info.sort(key=lambda m: m.created_at, reverse=True)
    return models_info

@app.post("/models/activate/{model_name}", response_model=Dict[str, Any], summary="Activate a Rasa model")
async def activate_rasa_model(model_name: str):
    ensure_directory(MODELS_DIR, "Rasa Models")
    original_model_path = MODELS_DIR / model_name
    active_model_target_path = MODELS_DIR / ACTIVE_MODEL_FILENAME
    active_model_source_file = MODELS_DIR / ".active_model_source"

    if not original_model_path.exists() or not original_model_path.is_file():
        raise HTTPException(status_code=404, detail=f"Model file '{model_name}' not found in {MODELS_DIR}.")
    if model_name == ACTIVE_MODEL_FILENAME:
        raise HTTPException(status_code=400, detail=f"Cannot activate '{ACTIVE_MODEL_FILENAME}' onto itself.")

    try:
        if active_model_target_path.exists(): active_model_target_path.unlink(missing_ok=True)
        shutil.copy(str(original_model_path), str(active_model_target_path))
        with open(active_model_source_file, "w", encoding="utf-8") as f: f.write(model_name)
        logger.info(f"Model '{model_name}' activated. Copied to '{ACTIVE_MODEL_FILENAME}'.")
        return {"success": True, "message": f"Model '{model_name}' is now active. Rasa API may need a restart."}
    except Exception as e:
        logger.error(f"Error activating model '{model_name}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to activate model '{model_name}': {str(e)}")

@app.delete("/models/{model_name}", response_model=Dict[str, Any], summary="Delete a Rasa model")
async def delete_rasa_model(model_name: str):
    ensure_directory(MODELS_DIR, "Rasa Models")
    model_to_delete_path = MODELS_DIR / model_name
    active_model_target_path = MODELS_DIR / ACTIVE_MODEL_FILENAME
    active_model_source_file = MODELS_DIR / ".active_model_source"

    if model_name == ACTIVE_MODEL_FILENAME:
        raise HTTPException(status_code=400, detail=f"Cannot delete '{ACTIVE_MODEL_FILENAME}' directly.")
    if not model_to_delete_path.exists():
        raise HTTPException(status_code=404, detail=f"Model file '{model_name}' not found.")

    try:
        is_currently_active_source = False
        if active_model_source_file.exists():
            try:
                if active_model_source_file.read_text().strip() == model_name:
                    is_currently_active_source = True
            except Exception as e:
                logger.error(f"Error reading active model source file during delete: {e}", exc_info=True)


        model_to_delete_path.unlink() # missing_ok=False by default, will raise if not found, but we check above
        message = f"Model '{model_name}' deleted."
        if is_currently_active_source:
            if active_model_target_path.exists(): active_model_target_path.unlink(missing_ok=True)
            if active_model_source_file.exists(): active_model_source_file.unlink(missing_ok=True)
            message += f" It was active, so '{ACTIVE_MODEL_FILENAME}' and its source tracking were cleared."
        logger.info(message)
        return {"success": True, "message": message}
    except Exception as e:
        logger.error(f"Error deleting model '{model_name}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete model '{model_name}': {str(e)}")

# --- Rasa API Service Management ---
def _get_running_rasa_pid_from_file() -> Optional[int]:
    if not RASA_API_PID_FILE.exists(): return None
    try:
        pid_str = RASA_API_PID_FILE.read_text().strip()
        if not pid_str:
            RASA_API_PID_FILE.unlink(missing_ok=True)
            return None
        pid = int(pid_str)
        if psutil.pid_exists(pid):
            # Optional: Add a more robust check if the process is indeed Rasa
            # p = psutil.Process(pid)
            # if "rasa" in " ".join(p.cmdline()).lower(): return pid
            return pid # Basic check
        else:
            RASA_API_PID_FILE.unlink(missing_ok=True) # Stale PID file
            return None
    except (ValueError, FileNotFoundError, psutil.Error) as e: # psutil.Error covers various psutil issues
        logger.warning(f"Error processing PID file '{RASA_API_PID_FILE}': {e}. Cleaning up.")
        RASA_API_PID_FILE.unlink(missing_ok=True)
        return None

@app.post("/rasa/start", response_model=RasaStatusResponse, summary="Start the Rasa API service")
async def start_rasa_api_service_endpoint():
    if _get_running_rasa_pid_from_file():
        raise HTTPException(status_code=400, detail="Rasa API service appears to be already running.")

    active_model_path = MODELS_DIR / ACTIVE_MODEL_FILENAME
    active_model_source_file = MODELS_DIR / ".active_model_source"
    if not active_model_path.exists():
        raise HTTPException(status_code=400, detail=f"Active model '{ACTIVE_MODEL_FILENAME}' not found. Activate a model first.")

    current_active_original_model_name = "Unknown (no source file)"
    if active_model_source_file.exists():
        try:
            current_active_original_model_name = active_model_source_file.read_text().strip()
        except Exception as e:
            logger.error(f"Error reading active model source file for Rasa start: {e}", exc_info=True)


    # Ensure the model path for Rasa command is relative to RASA_ROOT
    try:
        model_path_for_rasa_cmd = active_model_path.relative_to(RASA_ROOT)
    except ValueError: # If MODELS_DIR is not under RASA_ROOT for some reason
        logger.error(f"Cannot make model path {active_model_path} relative to RASA_ROOT {RASA_ROOT}. Using full path.")
        model_path_for_rasa_cmd = active_model_path # Fallback, though Rasa prefers relative from project root

    rasa_command = ["rasa", "run", "--enable-api", "--cors", "*", "-m", str(model_path_for_rasa_cmd), "--port", str(RASA_API_PORT)]
    logger.info(f"Attempting to start Rasa API. CWD: '{RASA_ROOT}', Cmd: '{' '.join(rasa_command)}'")

    try:
        ensure_directory(RASA_LOGS_DIR, "Rasa Logs")
        # Using CREATE_NO_WINDOW on Windows to prevent console window pop-up for Popen
        creationflags = 0
        if os.name == 'nt':
            creationflags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)

        with open(RASA_API_LOG_FILE, 'ab') as log_f: # Append binary mode
            process = subprocess.Popen(rasa_command, cwd=str(RASA_ROOT), stdout=log_f, stderr=log_f, creationflags=creationflags)
        RASA_API_PID_FILE.write_text(str(process.pid))
        logger.info(f"Rasa API process started (PID: {process.pid}). Logging to '{RASA_API_LOG_FILE}'.")
        await asyncio.sleep(7) # Allow time for startup or quick failure

        if psutil.pid_exists(process.pid):
            p_status = psutil.Process(process.pid).status()
            if p_status not in [psutil.STATUS_ZOMBIE, psutil.STATUS_DEAD]:
                log_file_rel_path = str(RASA_API_LOG_FILE.relative_to(RASA_PROJECT_BASE)) if RASA_API_LOG_FILE.is_relative_to(RASA_PROJECT_BASE) else str(RASA_API_LOG_FILE)
                return RasaStatusResponse(
                    status="running", pid=process.pid, model_name=current_active_original_model_name, port=RASA_API_PORT,
                    log_file=log_file_rel_path,
                    message=f"Rasa API started with model '{current_active_original_model_name}'.")
        # If process doesn't exist or is zombie/dead
        RASA_API_PID_FILE.unlink(missing_ok=True)
        log_file_rel_path = str(RASA_API_LOG_FILE.relative_to(RASA_PROJECT_BASE)) if RASA_API_LOG_FILE.is_relative_to(RASA_PROJECT_BASE) else str(RASA_API_LOG_FILE)
        detail_msg = f"Rasa process (PID: {process.pid if 'process' in locals() else 'N/A'}) did not stay alive or became zombie/dead. Check logs at '{log_file_rel_path}'."
        logger.error(detail_msg)
        raise HTTPException(status_code=500, detail=detail_msg)
    except FileNotFoundError: # For 'rasa' command
        logger.error("Rasa command not found. Is Rasa installed and in PATH?", exc_info=True)
        raise HTTPException(status_code=500, detail="Rasa command not found. Is Rasa installed and in PATH?")
    except Exception as e:
        logger.error(f"Failed to start Rasa API service: {e}", exc_info=True)
        if 'process' in locals() and hasattr(process, 'pid'): # If process object exists
            RASA_API_PID_FILE.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Error starting Rasa API: {str(e)}")

@app.post("/rasa/stop", response_model=RasaStatusResponse, summary="Stop the Rasa API service")
async def stop_rasa_api_service_endpoint():
    pid = _get_running_rasa_pid_from_file()
    if not pid:
        RASA_API_PID_FILE.unlink(missing_ok=True) # Clean if somehow left behind
        raise HTTPException(status_code=400, detail="Rasa API service is not running or PID file is missing/invalid.")

    logger.info(f"Attempting to stop Rasa API service (PID: {pid}).")
    try:
        parent = psutil.Process(pid)
        children = parent.children(recursive=True)
        for child in children:
            try: child.terminate()
            except psutil.Error: pass # Ignore errors if child already gone or permissions issue
        gone, alive = psutil.wait_procs(children, timeout=3) # Wait for children to terminate
        for p_alive in alive: # Force kill any remaining children
            try: p_alive.kill()
            except psutil.Error: pass

        parent.terminate()
        try:
            parent.wait(timeout=10) # Wait for parent to terminate
        except psutil.TimeoutExpired:
            logger.warning(f"Rasa parent process {pid} did not terminate gracefully, attempting to kill.")
            parent.kill()
            parent.wait(timeout=5) # Wait a bit after kill, raises TimeoutExpired if still running

        RASA_API_PID_FILE.unlink(missing_ok=True)
        logger.info(f"Rasa API service (PID: {pid}) stopped.")
        return RasaStatusResponse(status="stopped", message="Rasa API service stopped.")
    except psutil.NoSuchProcess:
        logger.warning(f"Rasa API service (PID: {pid}) was already stopped (process not found). Cleaning PID file.")
        RASA_API_PID_FILE.unlink(missing_ok=True)
        return RasaStatusResponse(status="stopped", message="Rasa API was not running (process not found). PID file cleaned.")
    except Exception as e:
        logger.error(f"Error stopping Rasa API (PID: {pid}): {e}", exc_info=True)
        # If process is confirmed dead, ensure PID file is gone. Otherwise, it might still be running.
        if pid and not psutil.pid_exists(pid):
            RASA_API_PID_FILE.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Failed to stop Rasa API: {str(e)}")

@app.get("/rasa/status", response_model=RasaStatusResponse, summary="Get Rasa API service status")
async def get_rasa_api_service_status_endpoint():
    pid = _get_running_rasa_pid_from_file()
    active_model_file = MODELS_DIR / ACTIVE_MODEL_FILENAME
    active_model_source_file = MODELS_DIR / ".active_model_source"
    model_name_display = "N/A"
    log_file_rel_path = None

    if RASA_API_LOG_FILE.is_file(): # Check before trying to make relative
        try: log_file_rel_path = str(RASA_API_LOG_FILE.relative_to(RASA_PROJECT_BASE))
        except ValueError: log_file_rel_path = str(RASA_API_LOG_FILE) # Not relative, use absolute

    if active_model_source_file.exists():
        try:
            model_name_display = active_model_source_file.read_text().strip()
            if not active_model_file.exists():
                model_name_display += " (active model file missing!)"
        except Exception as e:
            logger.error(f"Error reading active model source file for status: {e}", exc_info=True)
            model_name_display = "Error reading active model name"

    elif active_model_file.exists(): # If source file doesn't exist but active_model.tar.gz does
        model_name_display = f"{ACTIVE_MODEL_FILENAME} (source name unknown)"

    if pid:
        try:
            p = psutil.Process(pid)
            if p.status() == psutil.STATUS_ZOMBIE: # Explicitly check for zombie
                RASA_API_PID_FILE.unlink(missing_ok=True) # Clean up stale PID file
                return RasaStatusResponse(status="error", message="Rasa API process is a zombie. PID file cleaned.", pid=pid, log_file=log_file_rel_path)

            # Optional: More robust check if the process is indeed a Rasa process
            # cmdline = " ".join(p.cmdline()).lower()
            # if "rasa" not in cmdline:
            #     logger.warning(f"PID {pid} exists but cmdline ('{cmdline}') does not suggest a Rasa process. Cleaning PID.")
            #     RASA_API_PID_FILE.unlink(missing_ok=True)
            #     return RasaStatusResponse(status="stopped", message=f"PID {pid} is not a Rasa process. PID file cleaned.", log_file=log_file_rel_path)

            return RasaStatusResponse(
                status="running", pid=pid, model_name=model_name_display, port=RASA_API_PORT,
                log_file=log_file_rel_path)
        except psutil.NoSuchProcess:
            RASA_API_PID_FILE.unlink(missing_ok=True) # Clean up stale PID file
            return RasaStatusResponse(status="stopped", message="Rasa API was stopped (process not found). PID file cleaned.", log_file=log_file_rel_path)
        except Exception as e: # Catch other psutil errors or general exceptions
            logger.error(f"Error checking status for Rasa API process (PID: {pid}): {e}", exc_info=True)
            # Potentially check if PID still exists before declaring error vs stopped
            if not psutil.pid_exists(pid):
                 RASA_API_PID_FILE.unlink(missing_ok=True)
                 return RasaStatusResponse(status="stopped", message=f"Rasa process {pid} disappeared during status check.", log_file=log_file_rel_path)
            return RasaStatusResponse(status="error", message=f"Error checking process status: {str(e)}", pid=pid, log_file=log_file_rel_path)
    return RasaStatusResponse(status="stopped", message="Rasa API service is stopped.", log_file=log_file_rel_path)

# --- YAML File Management Endpoints ---
def _read_yaml_file(file_path: Path, default_content: Optional[Dict] = None):
    if default_content is None: default_content = {} # Ensure it's a dict for consistency
    if not file_path.exists():
        logger.warning(f"YAML file not found: {file_path}. Returning default content: {default_content}")
        return {"content": default_content}
    yaml_parser = YAML()
    yaml_parser.preserve_quotes = True
    yaml_parser.explicit_start = True
    try:
        content = yaml_parser.load(file_path)
        return {"content": content if content is not None else default_content} # Ensure content is not None
    except Exception as e:
        logger.error(f"Error reading or parsing YAML file {file_path}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Could not read or parse {file_path.name}: {str(e)}")

def _write_yaml_file(file_path: Path, data: YAMLContent, indent_options: Optional[Dict] = None):
    ensure_directory(file_path.parent, f"{file_path.parent.name} directory")
    yaml_writer = YAML()
    yaml_writer.preserve_quotes = False # Generally don't need to preserve quotes on write for Rasa files
    yaml_writer.explicit_start = True
    if indent_options:
        yaml_writer.indent(**indent_options)
    else: # Default Rasa-like indentation
        yaml_writer.indent(mapping=2, sequence=4, offset=2)

    try:
        content_to_write = data.content
        if file_path.name == "nlu.yml" and "nlu" in content_to_write and isinstance(content_to_write.get("nlu"), list):
            for item in content_to_write["nlu"]:
                if isinstance(item, dict) and "examples" in item and isinstance(item["examples"], str):
                    examples_text = item["examples"].replace('\\n', '\n').strip()
                    examples_text = re.sub(r'^["\'](.*)["\']$', r'\1', examples_text, flags=re.DOTALL) # Remove quotes if present
                    lines = [line.strip() for line in examples_text.split('\n') if line.strip()]
                    processed_lines = []
                    for line in lines:
                        if line and not line.startswith('- '): processed_lines.append(f"- {line}")
                        elif line: processed_lines.append(line) # If it already starts with '- ' or is just '-'

                    if processed_lines: # Only use LiteralScalarString if there's content
                        item["examples"] = LiteralScalarString('\n'.join(processed_lines) + '\n') # Ensure trailing newline for block
                    else: # Handle empty examples case
                        item["examples"] = LiteralScalarString('') # Or just "" if LiteralScalarString not needed for empty


        if file_path.name == "domain.yml" and "responses" in content_to_write:
            if isinstance(content_to_write.get("responses"), dict):
                for resp_key, resp_list in content_to_write["responses"].items():
                    if isinstance(resp_list, list):
                        for i, item_resp in enumerate(resp_list):
                            if isinstance(item_resp, dict) and "text" in item_resp and isinstance(item_resp["text"], str):
                                text_content = item_resp["text"].strip() # Strip whitespace
                                if "\n" in text_content: # Multiline text
                                    item_resp["text"] = LiteralScalarString(text_content + '\n')
                                # elif not text_content: # If text becomes empty after strip
                                #     item_resp["text"] = "" # Set to empty string
                                # else: # Single line, non-empty, keep as is
                                #     item_resp["text"] = text_content

        with open(file_path, "w", encoding="utf-8") as f:
            yaml_writer.dump(content_to_write, f)
        return {"success": True, "message": f"{file_path.name} updated successfully at {file_path}."}
    except Exception as e:
        logger.error(f"Failed to save YAML file {file_path}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to save {file_path.name}: {str(e)}")

@app.get("/nlu", summary="Get NLU data")
def get_nlu_data(): return _read_yaml_file(NLU_PATH, default_content={"version": "3.1", "nlu": []})
@app.post("/nlu", summary="Update NLU data")
def update_nlu_data(data: YAMLContent): return _write_yaml_file(NLU_PATH, data)

@app.get("/rules", summary="Get Rules data")
def get_rules_data(): return _read_yaml_file(RULES_PATH, default_content={"version": "3.1", "rules": []})
@app.post("/rules", summary="Update Rules data")
def update_rules_data(data: YAMLContent): return _write_yaml_file(RULES_PATH, data)

@app.get("/stories", summary="Get Stories data")
def get_stories_data(): return _read_yaml_file(STORIES_PATH, default_content={"version": "3.1", "stories": []})
@app.post("/stories", summary="Update Stories data")
def update_stories_data(data: YAMLContent): return _write_yaml_file(STORIES_PATH, data)

@app.get("/domain", summary="Get Domain data")
def get_domain_data(): return _read_yaml_file(DOMAIN_PATH, default_content={"version": "3.1", "intents": [], "responses": {}, "actions": []}) # More complete default
@app.post("/domain", summary="Update Domain data")
def update_domain_data(data: YAMLContent): return _write_yaml_file(DOMAIN_PATH, data)


# --- Rasa Train Endpoint ---
@app.post("/train", response_model=Dict[str, Any], summary="Trigger Rasa model training")
async def train_rasa_model():
    logger.info(f"Rasa training triggered. CWD for subprocess: {RASA_ROOT}")
    if not RASA_ROOT.exists() or not (RASA_ROOT / "config.yml").exists():
        logger.error(f"RASA_ROOT '{RASA_ROOT}' is not a valid Rasa project (missing config.yml or directory).")
        raise HTTPException(status_code=500, detail=f"RASA_ROOT '{RASA_ROOT}' is not a valid Rasa project.")
    ensure_directory(MODELS_DIR, "Rasa Models") # Ensure models dir exists before training

    try:
        # Using asyncio.create_subprocess_exec for non-blocking execution in async context
        process = await asyncio.create_subprocess_exec(
            "rasa", "train", # Add flags like "--force", "--augmentation", "0" if needed
            cwd=str(RASA_ROOT),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate() # Wait for completion

        stdout_decoded = stdout.decode(errors='ignore') if stdout else ""
        stderr_decoded = stderr.decode(errors='ignore') if stderr else ""

        if stdout_decoded: logger.info(f"Rasa train stdout:\n{stdout_decoded}")
        if stderr_decoded: logger.error(f"Rasa train stderr:\n{stderr_decoded}")

        if process.returncode != 0:
            # Consider parsing stderr for more specific error messages if Rasa provides them structured
            return {"success": False, "output": stdout_decoded, "error": stderr_decoded, "message": "Rasa training failed."}

        return {"success": True, "output": stdout_decoded, "error": stderr_decoded, "message": "Rasa training completed successfully."}

    except FileNotFoundError:
        logger.error("Rasa command not found. Is Rasa installed and in system PATH?", exc_info=True)
        raise HTTPException(status_code=500, detail="Rasa command not found. Ensure Rasa is installed and in PATH.")
    except Exception as e:
        logger.error(f"Rasa training process failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Rasa training process failed: {str(e)}")

# --- Main Execution Guard ---
if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting Uvicorn server for main:app on http://localhost:8000")
    logger.info(f"Effective RASA_ROOT is {RASA_ROOT.resolve() if RASA_ROOT else 'Not Set'}")
    # reload=True is great for development; for production, it should be False.
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

# from fastapi import FastAPI, HTTPException, Depends, Query
# from fastapi.middleware.cors import CORSMiddleware
# import subprocess
# from pathlib import Path
# from ruamel.yaml import YAML
# from ruamel.yaml.scalarstring import LiteralScalarString
# from pydantic import BaseModel, Field
# import re
# import logging
# import os
# from typing import List, Optional, Dict, Any
# from datetime import datetime
# from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
# from bson import ObjectId
# import shutil # For copying files
# import glob # For listing model files

# # Configure logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# app = FastAPI()

# # CORS Middleware
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # Allows all origins
#     allow_credentials=True,
#     allow_methods=["*"],  # Allows all methods
#     allow_headers=["*"],  # Allows all headers
# )

# # --- MongoDB Configuration ---
# MONGODB_URL = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
# DB_NAME = "cmaaa"
# UNKNOWN_QUERIES_COLLECTION = "unknown-queries"

# # Database connection
# mongo_client = None
# db = None

# # --- Path Definitions ---
# try:
#     SCRIPT_DIR = Path(__file__).resolve().parent
#     RASA_PROJECT_BASE = SCRIPT_DIR.parent.parent # Should be D:\Coding\CMAAA-Chatbot
#     RASA_ROOT = RASA_PROJECT_BASE / "rasa" # Corrected: Rasa project files are in 'rasa'
# except NameError:
#     logger.warning("__file__ not defined. Attempting to set RASA_ROOT based on environment variable or hardcoded path.")
#     rasa_project_rasa_path_env = os.environ.get("RASA_PROJECT_rasa_PATH")
#     if rasa_project_rasa_path_env:
#         RASA_ROOT = Path(rasa_project_rasa_path_env)
#         logger.info(f"RASA_ROOT set from RASA_PROJECT_rasa_PATH environment variable: {RASA_ROOT}")
#     else:
#         hardcoded_path = Path("D:/Coding/CMAAA-Chatbot/rasa") 
#         if hardcoded_path.exists() and (hardcoded_path / "domain.yml").exists(): # Check if domain.yml exists in rasa
#             RASA_ROOT = hardcoded_path
#             logger.warning(f"RASA_ROOT hardcoded to: {RASA_ROOT}. Consider using __file__ or environment variable.")
#         else:
#             logger.error(f"Could not automatically determine RASA_ROOT. Hardcoded path {hardcoded_path} also seems invalid. Please check path definitions.")
#             RASA_ROOT = Path(".") 


# DATA_DIR = RASA_ROOT / "data"
# MODELS_DIR = RASA_ROOT / "models" # Directory for Rasa models
# NLU_PATH = DATA_DIR / "nlu.yml"
# RULES_PATH = DATA_DIR / "rules.yml"
# STORIES_PATH = DATA_DIR / "stories.yml"
# DOMAIN_PATH = RASA_ROOT / "domain.yml" 
# ACTIVE_MODEL_FILENAME = "active_model.tar.gz" # The model Rasa server should be configured to use

# # Log resolved paths at startup for easier debugging
# logger.info(f"Script directory: {SCRIPT_DIR if '__file__' in locals() or '__file__' in globals() else 'N/A (__file__ not defined)'}")
# logger.info(f"RASA_PROJECT_BASE (intended D:\\Coding\\CMAAA-Chatbot) resolved to: {RASA_PROJECT_BASE if 'RASA_PROJECT_BASE' in locals() else 'N/A (likely due to __file__ issue)'}")
# logger.info(f"RASA_ROOT (intended D:\\Coding\\CMAAA-Chatbot\\rasa) resolved to: {RASA_ROOT}")
# logger.info(f"Data directory targeted at: {DATA_DIR}")
# logger.info(f"Models directory targeted at: {MODELS_DIR}")
# logger.info(f"NLU file targeted at: {NLU_PATH}")
# logger.info(f"Rules file targeted at: {RULES_PATH}")
# logger.info(f"Stories file targeted at: {STORIES_PATH}")
# logger.info(f"Domain file targeted at: {DOMAIN_PATH}")


# class YAMLContent(BaseModel):
#     content: dict

# # --- MongoDB Models ---
# class PyObjectId(ObjectId):
#     @classmethod
#     def __get_validators__(cls):
#         yield cls.validate

#     @classmethod
#     def validate(cls, v):
#         if not ObjectId.is_valid(v):
#             raise ValueError("Invalid ObjectId")
#         return ObjectId(v)

#     @classmethod
#     def __modify_schema__(cls, field_schema):
#         field_schema.update(type="string")

# class UnknownQueryBase(BaseModel):
#     query: str
#     timestamp: datetime = Field(default_factory=datetime.now)
#     intent_ranking: List[Dict[str, Any]] = []

# class UnknownQueryDB(UnknownQueryBase):
#     id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")

#     class Config:
#         allow_population_by_field_name = True
#         arbitrary_types_allowed = True
#         json_encoders = {ObjectId: str}

# class UnknownQueryCreate(UnknownQueryBase):
#     pass

# class UnknownQueryResponse(UnknownQueryBase):
#     id: str

#     class Config:
#         allow_population_by_field_name = True

# # --- Model Management Models ---
# class ModelInfo(BaseModel):
#     name: str
#     created_at: datetime
#     size_mb: float
#     is_active: bool

# # --- MongoDB Connection Management ---
# async def get_database() -> AsyncIOMotorDatabase:
#     global mongo_client, db
#     if not mongo_client:
#         try:
#             mongo_client = AsyncIOMotorClient(MONGODB_URL)
#             db = mongo_client[DB_NAME]
#             logger.info(f"Connected to MongoDB at {MONGODB_URL}, database: {DB_NAME}")
#         except Exception as e:
#             logger.error(f"Failed to connect to MongoDB: {e}")
#             raise HTTPException(status_code=500, detail=f"Database connection error: {str(e)}")
#     return db

# @app.on_event("shutdown")
# async def shutdown_db_client():
#     global mongo_client
#     if mongo_client:
#         mongo_client.close()
#         logger.info("MongoDB connection closed")

# # --- Helper functions to ensure directories exist ---
# def ensure_directory(dir_path: Path, dir_name: str):
#     """Ensures that a specified directory exists, creating it if necessary."""
#     if not RASA_ROOT.exists():
#         logger.error(f"RASA_ROOT directory {RASA_ROOT} does not exist. Cannot create {dir_name} directory.")
#         raise HTTPException(status_code=500, detail=f"Server configuration error: RASA_ROOT {RASA_ROOT} not found.")
#     try:
#         dir_path.mkdir(parents=True, exist_ok=True)
#         logger.info(f"Ensured {dir_name} directory exists at: {dir_path}")
#     except Exception as e:
#         logger.error(f"Could not create or access {dir_name} directory {dir_path}: {e}")
#         raise HTTPException(status_code=500, detail=f"Server error: Could not ensure {dir_name} directory {dir_path}")

# @app.on_event("startup")
# async def startup_event_handler():
#     await get_database()
#     ensure_directory(DATA_DIR, "data")
#     ensure_directory(MODELS_DIR, "models")


# @app.get("/")
# async def root():
#     return {"message": "Admin panel API is running!"}

# # --- Unknown Queries Endpoints ( 그대로 유지 ) ---
# @app.post("/unknown-queries", response_model=UnknownQueryResponse)
# async def create_unknown_query(query: UnknownQueryCreate, db: AsyncIOMotorDatabase = Depends(get_database)):
#     try:
#         collection = db[UNKNOWN_QUERIES_COLLECTION]
#         query_dict = query.dict()
#         result = await collection.insert_one(query_dict)
#         created_query = await collection.find_one({"_id": result.inserted_id})
#         if created_query:
#             created_query["id"] = str(created_query["_id"])
#             return created_query
#         raise HTTPException(status_code=500, detail="Failed to create unknown query record")
#     except Exception as e:
#         logger.error(f"Error creating unknown query record: {e}")
#         raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# @app.get("/unknown-queries", response_model=List[UnknownQueryResponse])
# async def get_unknown_queries(skip: int = 0, limit: int = 100, db: AsyncIOMotorDatabase = Depends(get_database)):
#     try:
#         collection = db[UNKNOWN_QUERIES_COLLECTION]
#         queries = []
#         cursor = collection.find().skip(skip).limit(limit).sort("timestamp", -1)
#         async for doc in cursor:
#             doc["id"] = str(doc["_id"])
#             queries.append(doc)
#         return queries
#     except Exception as e:
#         logger.error(f"Error retrieving unknown queries: {e}")
#         raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# @app.get("/unknown-queries/{query_id}", response_model=UnknownQueryResponse)
# async def get_unknown_query(query_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
#     try:
#         collection = db[UNKNOWN_QUERIES_COLLECTION]
#         if not ObjectId.is_valid(query_id):
#             raise HTTPException(status_code=400, detail=f"Invalid query ID format: {query_id}")
#         query_doc = await collection.find_one({"_id": ObjectId(query_id)})
#         if not query_doc:
#             raise HTTPException(status_code=404, detail=f"Unknown query with ID {query_id} not found")
#         query_doc["id"] = str(query_doc["_id"])
#         return query_doc
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error retrieving unknown query {query_id}: {e}")
#         raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# @app.delete("/unknown-queries/{query_id}")
# async def delete_unknown_query(query_id: str, db: AsyncIOMotorDatabase = Depends(get_database)):
#     try:
#         collection = db[UNKNOWN_QUERIES_COLLECTION]
#         if not ObjectId.is_valid(query_id):
#             raise HTTPException(status_code=400, detail=f"Invalid query ID format: {query_id}")
#         result = await collection.delete_one({"_id": ObjectId(query_id)})
#         if result.deleted_count == 0:
#             raise HTTPException(status_code=404, detail=f"Unknown query with ID {query_id} not found")
#         return {"success": True, "message": f"Unknown query with ID {query_id} deleted"}
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error deleting unknown query {query_id}: {e}")
#         raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# @app.get("/unknown-queries/search/", response_model=List[UnknownQueryResponse])
# async def search_unknown_queries(
#     query_text: str = Query(None, description="Search for queries containing this text"),
#     date_from: Optional[datetime] = Query(None, description="Filter queries from this date"),
#     date_to: Optional[datetime] = Query(None, description="Filter queries to this date"),
#     skip: int = 0, limit: int = 100, db: AsyncIOMotorDatabase = Depends(get_database)):
#     try:
#         collection = db[UNKNOWN_QUERIES_COLLECTION]
#         filter_query = {}
#         if query_text: filter_query["query"] = {"$regex": query_text, "$options": "i"}
#         date_filter = {}
#         if date_from: date_filter["$gte"] = date_from
#         if date_to: date_filter["$lte"] = date_to
#         if date_filter: filter_query["timestamp"] = date_filter
        
#         queries = []
#         cursor = collection.find(filter_query).skip(skip).limit(limit).sort("timestamp", -1)
#         async for doc in cursor:
#             doc["id"] = str(doc["_id"])
#             queries.append(doc)
#         return queries
#     except Exception as e:
#         logger.error(f"Error searching unknown queries: {e}")
#         raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# # --- Model Management Helper ---
# def get_model_creation_time_from_name(model_path: Path) -> datetime:
#     """Attempts to parse creation time from model filename (YYYYMMDD-HHMMSS.tar.gz)."""
#     try:
#         timestamp_str = model_path.stem # YYYYMMDD-HHMMSS
#         return datetime.strptime(timestamp_str, "%Y%m%d-%H%M%S")
#     except ValueError:
#         # Fallback to file modification time if parsing fails or name format is different
#         logger.warning(f"Could not parse timestamp from model name '{model_path.name}'. Falling back to file modification time.")
#         return datetime.fromtimestamp(model_path.stat().st_mtime)

# # --- Model Management Endpoints ---
# @app.get("/models", response_model=List[ModelInfo])
# async def list_rasa_models():
#     ensure_directory(MODELS_DIR, "models")
#     models_info = []
#     active_model_source_file = MODELS_DIR / ".active_model_source"
#     current_active_original_model_name = None

#     if active_model_source_file.exists():
#         current_active_original_model_name = active_model_source_file.read_text().strip()

#     # List all .tar.gz files in the models directory, excluding the active_model.tar.gz itself
#     model_files = [p for p in MODELS_DIR.glob("*.tar.gz") if p.name != ACTIVE_MODEL_FILENAME]

#     for model_file_path in model_files:
#         model_name = model_file_path.name
#         created_at = get_model_creation_time_from_name(model_file_path)
#         size_mb = round(model_file_path.stat().st_size / (1024 * 1024), 2)
#         is_active = (model_name == current_active_original_model_name)
        
#         models_info.append(ModelInfo(
#             name=model_name,
#             created_at=created_at,
#             size_mb=size_mb,
#             is_active=is_active
#         ))
    
#     models_info.sort(key=lambda m: m.created_at, reverse=True) # Show newest first
#     return models_info

# @app.post("/models/activate/{model_name}")
# async def activate_rasa_model(model_name: str):
#     ensure_directory(MODELS_DIR, "models")
#     original_model_path = MODELS_DIR / model_name
#     active_model_target_path = MODELS_DIR / ACTIVE_MODEL_FILENAME
#     active_model_source_file = MODELS_DIR / ".active_model_source"

#     if not original_model_path.exists():
#         raise HTTPException(status_code=404, detail=f"Model file '{model_name}' not found in {MODELS_DIR}.")
#     if model_name == ACTIVE_MODEL_FILENAME:
#         raise HTTPException(status_code=400, detail=f"Cannot activate '{ACTIVE_MODEL_FILENAME}' onto itself.")

#     try:
#         # If active_model.tar.gz exists, remove it before copying new one
#         if active_model_target_path.exists():
#             active_model_target_path.unlink()
        
#         shutil.copy(str(original_model_path), str(active_model_target_path))
        
#         # Store the name of the original model that is now active
#         with open(active_model_source_file, "w", encoding="utf-8") as f:
#             f.write(model_name)
            
#         logger.info(f"Model '{model_name}' activated. Copied to '{ACTIVE_MODEL_FILENAME}'. Rasa server may need restart.")
#         return {"success": True, "message": f"Model '{model_name}' is now active. Rasa server may need a restart to use '{ACTIVE_MODEL_FILENAME}'."}
#     except Exception as e:
#         logger.error(f"Error activating model '{model_name}': {e}", exc_info=True)
#         raise HTTPException(status_code=500, detail=f"Failed to activate model '{model_name}': {str(e)}")

# @app.delete("/models/{model_name}")
# async def delete_rasa_model(model_name: str):
#     ensure_directory(MODELS_DIR, "models")
#     model_to_delete_path = MODELS_DIR / model_name
#     active_model_target_path = MODELS_DIR / ACTIVE_MODEL_FILENAME
#     active_model_source_file = MODELS_DIR / ".active_model_source"

#     if model_name == ACTIVE_MODEL_FILENAME:
#         raise HTTPException(status_code=400, detail=f"Cannot delete '{ACTIVE_MODEL_FILENAME}' directly. Delete its source model if applicable or activate another model.")

#     if not model_to_delete_path.exists():
#         raise HTTPException(status_code=404, detail=f"Model file '{model_name}' not found.")

#     try:
#         is_currently_active_source = False
#         if active_model_source_file.exists():
#             if active_model_source_file.read_text().strip() == model_name:
#                 is_currently_active_source = True

#         model_to_delete_path.unlink() # Delete the original model file

#         message = f"Model '{model_name}' deleted."
#         if is_currently_active_source:
#             if active_model_target_path.exists():
#                 active_model_target_path.unlink() # Delete the active_model.tar.gz copy
#             if active_model_source_file.exists():
#                 active_model_source_file.unlink() # Delete the source tracking file
#             message += f" It was the active model, so '{ACTIVE_MODEL_FILENAME}' has been cleared."
#             logger.info(f"Active model '{model_name}' deleted. Cleared '{ACTIVE_MODEL_FILENAME}' and source tracking.")
        
#         logger.info(f"Model '{model_name}' deleted from {MODELS_DIR}.")
#         return {"success": True, "message": message}
#     except Exception as e:
#         logger.error(f"Error deleting model '{model_name}': {e}", exc_info=True)
#         raise HTTPException(status_code=500, detail=f"Failed to delete model '{model_name}': {str(e)}")


# # --- NLU Endpoints ---
# @app.get("/nlu")
# def get_nlu():
#     if not DATA_DIR.exists():
#         raise HTTPException(status_code=404, detail=f"Data directory '{DATA_DIR.name}' (expected at {DATA_DIR}) not found.")
#     if not NLU_PATH.exists():
#         return {"content": {"version": "3.1", "nlu": []}} # Return empty structure if file doesn't exist
    
#     yaml = YAML()
#     yaml.preserve_quotes = False 
#     yaml.explicit_start = True
#     try:
#         with open(NLU_PATH, "r", encoding="utf-8") as f:
#             parsed_content = yaml.load(f)
#         return {"content": parsed_content or {"version": "3.1", "nlu": []}} # Ensure content is not None
#     except Exception as e:
#         logger.error(f"Error reading or parsing nlu.yml from {NLU_PATH}: {e}")
#         raise HTTPException(status_code=500, detail=f"Could not read or parse nlu.yml: {e}")

# @app.post("/nlu")
# def update_nlu(nlu_data: YAMLContent):
#     ensure_directory(DATA_DIR, "data")
#     try:
#         yaml_handler = YAML()
#         yaml_handler.preserve_quotes = False
#         yaml_handler.explicit_start = True
#         yaml_handler.indent(mapping=2, sequence=4, offset=2)
        
#         nlu_content = nlu_data.content
#         if "nlu" in nlu_content and isinstance(nlu_content.get("nlu"), list):
#             for item in nlu_content["nlu"]: 
#                 if isinstance(item, dict) and "examples" in item:
#                     examples_text = item["examples"]
#                     if isinstance(examples_text, str):
#                         examples_text = examples_text.replace('\\n', '\n')
#                         examples_text = re.sub(r'^["\'](.*)["\']$', r'\1', examples_text.strip(), flags=re.DOTALL)
#                         examples_lines = [line.strip() for line in examples_text.split('\n') if line.strip()]
#                         processed_lines = []
#                         for line in examples_lines:
#                             if line and not line.startswith('- '): processed_lines.append(f"- {line}")
#                             elif line: processed_lines.append(line)
#                         item["examples"] = LiteralScalarString('\n'.join(processed_lines))
#                     elif isinstance(examples_text, list):
#                         processed_list_examples = []
#                         for ex_item in examples_text:
#                             ex_str = str(ex_item).strip()
#                             if ex_str and not ex_str.startswith('- '): processed_list_examples.append(f'- {ex_str}')
#                             elif ex_str: processed_list_examples.append(ex_str)
#                         item["examples"] = LiteralScalarString('\n'.join(processed_list_examples))
        
#         with open(NLU_PATH, "w", encoding="utf-8") as f:
#             yaml_handler.dump(nlu_content, f)
#         return {"success": True, "message": f"nlu.yml updated successfully at {NLU_PATH}."}
#     except Exception as e:
#         logger.error(f"Failed to save nlu.yml to {NLU_PATH}: {e}", exc_info=True)
#         raise HTTPException(status_code=500, detail=f"Failed to save nlu.yml: {str(e)}")

# # --- Rules Endpoints ---
# @app.get("/rules")
# def get_rules():
#     if not DATA_DIR.exists(): raise HTTPException(status_code=404, detail=f"Data directory not found.")
#     if not RULES_PATH.exists(): return {"content": {"version": "3.1", "rules": []}}
#     yaml = YAML(); yaml.preserve_quotes = False; yaml.explicit_start = True
#     try:
#         with open(RULES_PATH, "r", encoding="utf-8") as f: parsed_content = yaml.load(f)
#         return {"content": parsed_content or {"version": "3.1", "rules": []}}
#     except Exception as e: raise HTTPException(status_code=500, detail=f"Could not read/parse rules.yml: {e}")

# @app.post("/rules")
# def update_rules(rules_data: YAMLContent):
#     ensure_directory(DATA_DIR, "data")
#     try:
#         yaml_handler = YAML(); yaml_handler.preserve_quotes = False; yaml_handler.explicit_start = True
#         yaml_handler.indent(mapping=2, sequence=4, offset=2)
#         rules_content = rules_data.content
#         if "rules" in rules_content and isinstance(rules_content.get("rules"), list):
#             for rule in rules_content["rules"]:
#                 if isinstance(rule, dict) and "steps" in rule and isinstance(rule.get("steps"), list):
#                     formatted_steps = []
#                     for step in rule["steps"]:
#                         if isinstance(step, str): 
#                             parts = step.lstrip("- ").split(":", 1) if step.startswith("- ") else step.split(":", 1)
#                             if len(parts) == 2: formatted_steps.append({parts[0].strip(): parts[1].strip()})
#                             else: formatted_steps.append(step.lstrip("- ").strip() if step.startswith("- ") else step.strip())
#                         elif isinstance(step, dict): formatted_steps.append(step)
#                     rule["steps"] = formatted_steps
#         with open(RULES_PATH, "w", encoding="utf-8") as f: yaml_handler.dump(rules_content, f)
#         return {"success": True, "message": f"rules.yml updated successfully at {RULES_PATH}."}
#     except Exception as e: raise HTTPException(status_code=500, detail=f"Failed to save rules.yml: {str(e)}")

# # --- Stories Endpoints ---
# @app.get("/stories")
# def get_stories():
#     if not DATA_DIR.exists(): raise HTTPException(status_code=404, detail=f"Data directory not found.")
#     if not STORIES_PATH.exists(): return {"content": {"version": "3.1", "stories": []}}
#     yaml = YAML(); yaml.preserve_quotes = False; yaml.explicit_start = True
#     try:
#         with open(STORIES_PATH, "r", encoding="utf-8") as f: parsed_content = yaml.load(f)
#         return {"content": parsed_content or {"version": "3.1", "stories": []}}
#     except Exception as e: raise HTTPException(status_code=500, detail=f"Could not read/parse stories.yml: {e}")

# @app.post("/stories")
# def update_stories(stories_data: YAMLContent):
#     ensure_directory(DATA_DIR, "data")
#     try:
#         yaml_handler = YAML(); yaml_handler.preserve_quotes = False; yaml_handler.explicit_start = True
#         yaml_handler.indent(mapping=2, sequence=4, offset=2)
#         stories_content = stories_data.content
#         if "stories" in stories_content and isinstance(stories_content.get("stories"), list):
#             for story in stories_content["stories"]:
#                 if isinstance(story, dict) and "steps" in story and isinstance(story.get("steps"), list):
#                     formatted_steps = []
#                     for step in story["steps"]:
#                         if isinstance(step, str):
#                             parts = step.lstrip("- ").split(":", 1) if step.startswith("- ") else step.split(":", 1)
#                             if len(parts) == 2: formatted_steps.append({parts[0].strip(): parts[1].strip()})
#                             else: formatted_steps.append(step.lstrip("- ").strip() if step.startswith("- ") else step.strip())
#                         elif isinstance(step, dict): formatted_steps.append(step)
#                     story["steps"] = formatted_steps
#         with open(STORIES_PATH, "w", encoding="utf-8") as f: yaml_handler.dump(stories_content, f)
#         return {"success": True, "message": f"stories.yml updated successfully at {STORIES_PATH}."}
#     except Exception as e: raise HTTPException(status_code=500, detail=f"Failed to save stories.yml: {str(e)}")

# # --- Domain Endpoint ---
# @app.get("/domain")
# def get_domain():
#     if not DOMAIN_PATH.exists(): return {"content": {}} # Return empty structure if file doesn't exist
#     yaml = YAML(); yaml.preserve_quotes = False; yaml.explicit_start = True
#     try:
#         with open(DOMAIN_PATH, "r", encoding="utf-8") as f: parsed_content = yaml.load(f)
#         return {"content": parsed_content or {}}
#     except Exception as e: raise HTTPException(status_code=500, detail=f"Could not read/parse domain.yml: {e}")

# @app.post("/domain")
# def update_domain(domain_data: YAMLContent):
#     if not RASA_ROOT.exists(): raise HTTPException(status_code=500, detail=f"RASA_ROOT {RASA_ROOT} not found.")
#     try:
#         yaml_handler = YAML(); yaml_handler.preserve_quotes = False; yaml_handler.explicit_start = True
#         yaml_handler.indent(mapping=2, sequence=4, offset=2)
#         domain_content = domain_data.content
#         if "responses" in domain_content and isinstance(domain_content.get("responses"), dict):
#             for resp_key, resp_list in domain_content["responses"].items():
#                 if isinstance(resp_list, list):
#                     for i, item in enumerate(resp_list):
#                         if isinstance(item, dict) and "text" in item and isinstance(item["text"], str) and "\n" in item["text"]:
#                             item["text"] = LiteralScalarString(item["text"].strip())
#         with open(DOMAIN_PATH, "w", encoding="utf-8") as f: yaml_handler.dump(domain_content, f)
#         return {"success": True, "message": f"domain.yml updated successfully at {DOMAIN_PATH}."}
#     except Exception as e: raise HTTPException(status_code=500, detail=f"Failed to save domain.yml: {str(e)}")

# # --- Rasa Actions ---
# @app.post("/train")
# def train_model():
#     logger.info(f"Rasa training triggered. CWD for subprocess will be: {RASA_ROOT}")
#     if not RASA_ROOT.exists() or not (RASA_ROOT / "config.yml").exists(): 
#         logger.error(f"RASA_ROOT {RASA_ROOT} does not appear to be a valid Rasa project directory.")
#         raise HTTPException(status_code=500, detail=f"RASA_ROOT ({RASA_ROOT}) is not a valid Rasa project directory.")
#     try:
#         # Ensure models directory exists before training
#         ensure_directory(MODELS_DIR, "models")
        
#         process = subprocess.run(
#             ["rasa", "train"],
#             cwd=str(RASA_ROOT), 
#             capture_output=True, text=True, check=False, shell=False # Set shell=False for security
#         )
#         logger.info(f"Rasa train stdout: {process.stdout}")
#         if process.stderr: logger.error(f"Rasa train stderr: {process.stderr}")
        
#         # After training, if a new model is created, clear any existing active model designation
#         # as Rasa typically puts the new model as the latest, which might be used by default.
#         # Or, the user might want to explicitly activate the newly trained model.
#         # For now, we'll just report success/failure of training.
#         active_model_source_file = MODELS_DIR / ".active_model_source"
#         active_model_target_path = MODELS_DIR / ACTIVE_MODEL_FILENAME
        
#         if process.returncode == 0:
#              # Optional: Automatically activate the newest model after training
#              # This requires finding the newest .tar.gz file in MODELS_DIR
#             pass # For now, user must activate manually.

#         return {"success": process.returncode == 0, "output": process.stdout, "error": process.stderr}
#     except FileNotFoundError:
#         logger.error("Rasa command not found. Is Rasa installed and in PATH?")
#         raise HTTPException(status_code=500, detail="Rasa command not found.")
#     except Exception as e:
#         logger.error(f"Rasa training failed: {e}", exc_info=True)
#         raise HTTPException(status_code=500, detail=f"Rasa training process failed: {str(e)}")

# if __name__ == "__main__":
#     import uvicorn
#     logger.info(f"Starting Uvicorn server for main:app. Effective RASA_ROOT is {RASA_ROOT}")
#     uvicorn.run(app, host="0.0.0.0", port=8000)