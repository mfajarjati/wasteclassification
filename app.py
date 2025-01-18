from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ultralytics import YOLO
from PIL import Image
import io
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Load YOLO model
try:
    model = YOLO("best.pt")
    print("Model class mapping:", model.names)
    # Should output something like {0: 'organik', 1: 'anorganik', 2: 'b3'}
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    raise

@app.post("/detect/")
async def detect(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        results = model(image)
        
        # Map class indices correctly
        class_mapping = {
            0: "anorganik", 
            1: "b3",
            2: "organik",
        }
        
        detections = []
        for r in results[0].boxes:
            class_idx = int(r.cls)
            detections.append({
                "class": class_mapping[class_idx],
                "confidence": float(r.conf),
                "bbox": [float(x) for x in r.xyxy[0].tolist()]
            })
        
        logger.debug(f"Detections: {detections}")
        return JSONResponse(content={"detections": detections})
        
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))