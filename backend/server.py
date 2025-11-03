from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import random
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    parent_id: str
    name: str
    message: str

class BusInfo(BaseModel):
    bus_id: str
    bus_number: str
    driver_name: str
    route: str
    status: str

class Child(BaseModel):
    id: str
    name: str
    class_name: str
    section: str
    roll_number: str
    profile_image: str
    bus_info: BusInfo
    home_location: dict

class BusLocation(BaseModel):
    bus_id: str
    latitude: float
    longitude: float
    timestamp: str
    eta_minutes: int
    status: str

# Mock data
MOCK_PARENTS = {
    "parent@school.com": {
        "password": "password123",
        "parent_id": "parent_001",
        "name": "Sarah Johnson"
    }
}

MOCK_CHILDREN = [
    {
        "id": "child_001",
        "parent_id": "parent_001",
        "name": "Emma Johnson",
        "class_name": "5th Grade",
        "section": "A",
        "roll_number": "15",
        "profile_image": "https://i.pravatar.cc/150?img=1",
        "bus_info": {
            "bus_id": "bus_001",
            "bus_number": "SB-42",
            "driver_name": "Mr. Michael Brown",
            "route": "Route A - North District",
            "status": "On Route"
        },
        "home_location": {
            "latitude": 37.7899,
            "longitude": -122.4164
        }
    },
    {
        "id": "child_002",
        "parent_id": "parent_001",
        "name": "Oliver Johnson",
        "class_name": "3rd Grade",
        "section": "B",
        "roll_number": "08",
        "profile_image": "https://i.pravatar.cc/150?img=2",
        "bus_info": {
            "bus_id": "bus_002",
            "bus_number": "SB-17",
            "driver_name": "Ms. Jennifer Davis",
            "route": "Route B - East District",
            "status": "At School"
        },
        "home_location": {
            "latitude": 37.7849,
            "longitude": -122.4094
        }
    }
]

SCHOOL_LOCATION = {
    "latitude": 37.7749,
    "longitude": -122.4194
}

# Bus routes (waypoints)
BUS_ROUTES = {
    "bus_001": [
        {"latitude": 37.7749, "longitude": -122.4194},  # School
        {"latitude": 37.7769, "longitude": -122.4204},
        {"latitude": 37.7789, "longitude": -122.4144},
        {"latitude": 37.7819, "longitude": -122.4154},
        {"latitude": 37.7849, "longitude": -122.4164},
        {"latitude": 37.7899, "longitude": -122.4164}   # Home
    ],
    "bus_002": [
        {"latitude": 37.7749, "longitude": -122.4194},  # School
        {"latitude": 37.7759, "longitude": -122.4164},
        {"latitude": 37.7779, "longitude": -122.4124},
        {"latitude": 37.7809, "longitude": -122.4104},
        {"latitude": 37.7849, "longitude": -122.4094}   # Home
    ]
}

# Simulate bus movement
def get_bus_location(bus_id: str):
    """Simulate bus moving along route"""
    if bus_id not in BUS_ROUTES:
        return None
    
    route = BUS_ROUTES[bus_id]
    # Get current second to simulate movement
    current_time = datetime.now().second
    
    # Calculate position along route based on time
    progress = (current_time % 50) / 50.0  # Complete cycle every 50 seconds
    
    if progress < 0.2:
        # Near school
        waypoint_index = 0
        local_progress = progress / 0.2
    elif progress < 0.4:
        waypoint_index = 1
        local_progress = (progress - 0.2) / 0.2
    elif progress < 0.6:
        waypoint_index = 2
        local_progress = (progress - 0.4) / 0.2
    elif progress < 0.8:
        waypoint_index = 3
        local_progress = (progress - 0.6) / 0.2
    else:
        waypoint_index = 4
        local_progress = (progress - 0.8) / 0.2
    
    if waypoint_index >= len(route) - 1:
        waypoint_index = len(route) - 2
    
    # Interpolate between waypoints
    start = route[waypoint_index]
    end = route[waypoint_index + 1]
    
    lat = start["latitude"] + (end["latitude"] - start["latitude"]) * local_progress
    lng = start["longitude"] + (end["longitude"] - start["longitude"]) * local_progress
    
    # Calculate ETA (mock)
    remaining_waypoints = len(route) - waypoint_index - 1
    eta = int(remaining_waypoints * 5 + (1 - local_progress) * 5)
    
    status = "On Route" if waypoint_index < len(route) - 2 else "Near Home"
    
    return {
        "bus_id": bus_id,
        "latitude": lat,
        "longitude": lng,
        "timestamp": datetime.now().isoformat(),
        "eta_minutes": eta,
        "status": status
    }

# Routes
@api_router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Mock login endpoint"""
    if request.email in MOCK_PARENTS:
        parent = MOCK_PARENTS[request.email]
        if parent["password"] == request.password:
            return LoginResponse(
                success=True,
                parent_id=parent["parent_id"],
                name=parent["name"],
                message="Login successful"
            )
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/children/{parent_id}", response_model=List[Child])
async def get_children(parent_id: str):
    """Get children for a parent"""
    children = [c for c in MOCK_CHILDREN if c["parent_id"] == parent_id]
    if not children:
        raise HTTPException(status_code=404, detail="No children found")
    return children

@api_router.get("/child/{child_id}", response_model=Child)
async def get_child(child_id: str):
    """Get specific child details"""
    child = next((c for c in MOCK_CHILDREN if c["id"] == child_id), None)
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return child

@api_router.get("/bus/{bus_id}/location", response_model=BusLocation)
async def get_bus_location_endpoint(bus_id: str):
    """Get live bus location"""
    location = get_bus_location(bus_id)
    if not location:
        raise HTTPException(status_code=404, detail="Bus not found")
    return location

@api_router.get("/school/location")
async def get_school_location():
    """Get school location"""
    return SCHOOL_LOCATION

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
