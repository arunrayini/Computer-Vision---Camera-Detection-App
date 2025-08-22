from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import cv2
import numpy as np
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# Load YOLO model (replace with your trained .pt file if needed)
model = YOLO("yolov8n.pt")  # e.g. "urine_volume_parent.pt"

def decode_base64_image(image_base64):
    """Convert base64 string from frontend into OpenCV image"""
    image_data = base64.b64decode(image_base64.split(",")[1])
    np_array = np.frombuffer(image_data, np.uint8)
    return cv2.imdecode(np_array, cv2.IMREAD_COLOR)

@app.route("/")
def home():
    return "✅ Camera backend with YOLO is running."

@app.route("/upload_frame", methods=["POST"])
def upload_frame():
    try:
        data = request.get_json()
        if "image" not in data:
            return jsonify({"error": "No image field in request"}), 400

        # Decode image
        img = decode_base64_image(data["image"])

        # Run YOLO inference
        results = model.predict(img, conf=0.5, verbose=False)

        boxes_out = []
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                label = model.names[cls_id]

                H, W = img.shape[:2]
                boxes_out.append({
                    "x1": x1 / W,
                    "y1": y1 / H,
                    "x2": x2 / W,
                    "y2": y2 / H,
                    "confidence": conf,
                    "label": label
                })

        return jsonify({"boxes": boxes_out}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
