from flask_cors import CORS
from flask import Flask, request, jsonify
import base64
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)


# Folder to store uploaded frames
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def home():
    return "✅ Camera backend is running."

@app.route('/upload_frame', methods=['POST'])
def upload_frame():
    try:
        data = request.get_json()

        # Ensure image data is present
        if 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400

        # Extract and decode base64 image
        image_data = data['image'].split(",")[1]  # Strip data URL prefix
        image_bytes = base64.b64decode(image_data)

        # Generate timestamped filename
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
        filename = f"frame_{timestamp}.jpg"
        filepath = os.path.join(UPLOAD_FOLDER, filename)

        # Save the image to disk
        with open(filepath, "wb") as f:
            f.write(image_bytes)

        return jsonify({'message': f'Frame {filename} received successfully'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
