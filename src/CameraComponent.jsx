import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import "./CameraComponent.css";

const CameraComponent = () => {
    const webcamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const [recording, setRecording] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const [capturedImages, setCapturedImages] = useState([]);
    const [logs, setLogs] = useState([]);
    const [devices, setDevices] = useState([]);
    const [deviceId, setDeviceId] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef(null);

    // Load available cameras
    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then((mediaDevices) => {
            const videoDevices = mediaDevices.filter(
                (device) => device.kind === "videoinput"
            );
            setDevices(videoDevices);
            if (videoDevices.length > 0) {
                setDeviceId(videoDevices[0].deviceId);
            }
        });
    }, []);
  const formatTime = (seconds) => {
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
};


   

    // Start recording
    const startRecording = () => {
    setLogs((prev) => [
        ...prev,
        { event: "Video Recording Started", timestamp: new Date().toISOString() },
    ]);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
    }, 1000);
    setRecording(true);
    setRecordedChunks([]);
    const stream = webcamRef.current.stream;
    mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "video/webm",
    });
    mediaRecorderRef.current.ondataavailable = handleDataAvailable;
    mediaRecorderRef.current.start();
};


    // Stop recording
    const stopRecording = () => {
    clearInterval(timerRef.current);
    setLogs((prev) => [
        ...prev,
        { event: "Video Recording Stopped", timestamp: new Date().toISOString() },
    ]);
    setRecording(false);
    mediaRecorderRef.current.stop();
    };


    // Save recorded video
    const handleDataAvailable = (event) => {
        if (event.data.size > 0) {
            setRecordedChunks((prev) => [...prev, event.data]);
        }
    };

    useEffect(() => {
        if (!recording && recordedChunks.length) {
            const blob = new Blob(recordedChunks, {
                type: "video/webm",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "recorded_video.webm";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }, [recording, recordedChunks]);
    useEffect(() => {
    const interval = setInterval(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                fetch("http://localhost:5000/upload_frame", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ image: imageSrc }),
                }).then((res) =>
                    console.log("Frame sent to backend", res.status)
                ).catch((err) =>
                    console.error("Error sending frame:", err)
                );
            }
        }
    }, 1000); // send every second

    return () => clearInterval(interval); // clear on component unmount
}, [deviceId]);

const capture = () => {
  const imageSrc = webcamRef.current.getScreenshot(); // ← define it here
  const timestamp = new Date().toISOString();

  setCapturedImages((prev) => [...prev, { imageSrc, timestamp }]);
  setLogs((prev) => [...prev, { event: "Snapshot Taken", timestamp }]);

  // Send to backend
  fetch("http://localhost:5000/upload_frame", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ image: imageSrc }),
  })
    .then((res) => res.json())
    .then((data) => console.log("✅ Backend response:", data))
    .catch((err) => console.error("❌ Error sending frame to backend:", err));
};


    // Save logs as JSON
    const saveEventLog = () => {
        const blob = new Blob([JSON.stringify(logs, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "logs.json";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="container">
            <h1>Camera Interface</h1>

            {/* Camera selector */}
            <select
                onChange={(e) => setDeviceId(e.target.value)}
                value={deviceId || ""}
            >
                {devices.map((device, idx) => (
                    <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${idx + 1}`}
                    </option>
                ))}
            </select>
    {recording && (
  <div className="timer">
    <span className="dot" /> Recording: {formatTime(recordingTime)}
  </div>
)}


            {/* Webcam feed */}
            <div className="webcam-box">
                <Webcam
                    className="webcam"
                    audio={true}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ deviceId }}
                />
            </div>

            <div>
                <button onClick={capture}>Take Snapshot</button>
                <button onClick={saveEventLog}>Download Event Log</button>
                {recording ? (
                    <button onClick={stopRecording}>Stop Recording</button>
                ) : (
                    <button onClick={startRecording}>Start Recording</button>
                )}
            </div>

            {/* Snapshots display */}
            <div className="snapshots">
                {capturedImages.map((item, idx) => (
                    <div key={idx} className="snapshot-box">
                        <p>{item.timestamp}</p>
                        <img src={item.imageSrc} alt={`snap-${idx}`} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CameraComponent;
