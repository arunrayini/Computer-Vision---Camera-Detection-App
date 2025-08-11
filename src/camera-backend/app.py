from flask import Flask, request, jsonify
from datetime import datetime
import os

app = Flask(__name__)

# Create upload folder if not exists
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

@app.route("/")
def home():
    return "Camera Backend is running!"

@app.route("/upload_snapshot", methods=["POST"])
def upload_snapshot():
    if 'image' not in request.files:
        return jsonify({"error": "No image part"}), 400

    image = request.files['image']
    timestamp = request.form.get('timestamp', datetime.utcnow().isoformat())

    if image.filename == '':
        return jsonify({"error": "No selected file"}), 400

    filename = f"{timestamp.replace(':', '-').replace('.', '-')}.jpg"
    save_path = os.path.join(UPLOAD_FOLDER, filename)
    image.save(save_path)

    return jsonify({"message": "Snapshot uploaded successfully", "filename": filename}), 200

if __name__ == "__main__":
    app.run(debug=True)
