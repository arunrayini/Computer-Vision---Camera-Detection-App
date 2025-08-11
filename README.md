# 🎥 Real-Time Camera Interface with Snapshot & Frame Upload

This project is a **React + Flask-based camera system** that allows users to:

- Stream live video from available webcams.
- Take snapshots and store logs with timestamps.
- Record video with timer and download it.
- Send frames **every second** to a Flask backend for further processing or storage.

---

## 🧰 Technologies & Libraries

### 🔹 Frontend (React)

- **React** – UI library.
- **react-webcam** – Webcam component for capturing video and screenshots.
- **JavaScript Fetch API** – Sending frames to backend.
- **Blob / URL.createObjectURL** – Video download.

### 🔹 Backend (Flask)

- **Flask** – Web framework.
- **flask_cors** – Enables CORS to allow frontend-backend communication.
- **base64** – Decoding images sent from frontend.
- **os** / **datetime** – Handling uploads and naming files with timestamps.

---

## 🚀 How It Works

### 🖥 Frontend (`CameraComponent.jsx`)

- Lists available camera devices.
- Allows switching cameras via dropdown.
- User can:
  - 📸 Take snapshot → logged & shown on UI.
  - 🎬 Record video → timer updates & downloadable.
  - 🧠 Background task sends frames every 1 second to Flask.

```jsx
setInterval(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    fetch("http://localhost:5000/upload_frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageSrc }),
    });
}, 1000);

Backend (app.py)
Starts Flask server on port 5000.

Accepts POST requests on /upload_frame.

Receives base64-encoded image, decodes it, and saves it as .jpg with timestamp.

@app.route('/upload_frame', methods=['POST'])
def upload_frame():
    image_data = request.get_json()['image'].split(",")[1]
    image_bytes = base64.b64decode(image_data)
    ...
Stored in /uploaded_frames with a name like:
frame_20250716141730824930.jpg

🛠️ Setup Instructions
⚙️ Backend Setup (Flask)
cd camera-backend
pip install flask flask-cors
python app.py
This runs at: http://localhost:5000

🌐 Frontend Setup (React)
cd camera-frontend
npm install
npm start
This runs at: http://localhost:3000

Key Features
Auto camera detection.

Snapshot capture with timestamp log.

Video recording with built-in download.

Real-time frame upload to backend every 1 sec.

Fully styled responsive UI.

Saved Files
📸 Snapshots → Displayed in the UI with timestamp.

🎥 Recorded Video → Downloads as recorded_video.webm.

📝 Event Logs → Downloaded as logs.json.

🧠 Frames Sent to Backend → Saved in camera-backend/uploaded_frames.

📈 Performance Note
Latency is typically low (~100–200ms) on localhost.

You may optimize image resolution, compression, or FPS for production use.