import React, { useEffect, useMemo, useRef, useState } from "react";
import Webcam from "react-webcam";
import "./CameraComponent.css";

/** Hook to track element size */
function useElementSize(ref) {
    const [size, setSize] = useState({ w: 0, h: 0 });
    useEffect(() => {
        if (!ref.current) return;
        const ro = new ResizeObserver((entries) => {
            for (const e of entries) {
                setSize({
                    w: Math.round(e.contentRect.width),
                    h: Math.round(e.contentRect.height),
                });
            }
        });
        ro.observe(ref.current);
        return () => ro.disconnect();
    }, [ref]);
    return size;
}

/** Mapping util: normalized box -> UI pixels with 'contain' fit */
function mapBoxNormToUI(box, W_src, H_src, W_ui, H_ui) {
    const s = Math.min(W_ui / W_src, H_ui / H_src);
    const Wc = W_src * s;
    const Hc = H_src * s;
    const offX = (W_ui - Wc) / 2;
    const offY = (H_ui - Hc) / 2;
    return {
        X1: offX + box.x1 * Wc,
        Y1: offY + box.y1 * Hc,
        X2: offX + box.x2 * Wc,
        Y2: offY + box.y2 * Hc,
    };
}

// Fallback until we auto-detect from the stream
const DEFAULT_SRC = { W: 1280, H: 720 };

export default function CameraComponent() {
    const webcamRef = useRef(null);
    const containerRef = useRef(null);
    const uiSize = useElementSize(containerRef);

    const [detections, setDetections] = useState([]);
    const [devices, setDevices] = useState([]);
    const [deviceId, setDeviceId] = useState(null);
    const [srcSize, setSrcSize] = useState(DEFAULT_SRC);

    const [demo, setDemo] = useState(false);  // demo OFF by default
    const [boxWidth, setBoxWidth] = useState(960);

    // Load available cameras
    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then((mediaDevices) => {
            const videoDevices = mediaDevices.filter((d) => d.kind === "videoinput");
            setDevices(videoDevices);
            if (videoDevices.length > 0) setDeviceId(videoDevices[0].deviceId);
        });
    }, []);

    // Detect real video dimensions when ready
    useEffect(() => {
        const id = setInterval(() => {
            const v = webcamRef.current?.video;
            if (v?.videoWidth && v?.videoHeight) {
                setSrcSize({ W: v.videoWidth, H: v.videoHeight });
                clearInterval(id);
                console.log("Detected SRC:", v.videoWidth, v.videoHeight);
            }
        }, 200);
        return () => clearInterval(id);
    }, []);

    // Poll backend every second
    useEffect(() => {
        if (demo) return;
        const interval = setInterval(() => {
            const imageSrc = webcamRef.current?.getScreenshot();
            if (!imageSrc) return;

            fetch("http://localhost:5000/upload_frame", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: imageSrc }),
            })
                .then(async (res) => {
                    const body = await res.json().catch(() => ({}));
                    if (Array.isArray(body.boxes)) {
                        setDetections(body.boxes);
                    } else {
                        console.warn("No 'boxes' in response:", body);
                    }
                })
                .catch((err) => console.error("Error sending frame:", err));
        }, 1000);
        return () => clearInterval(interval);
    }, [deviceId, demo]);

    // Map backend/demo boxes → UI boxes with metadata
    const mappedBoxes = useMemo(() => {
        if (!uiSize.w || !uiSize.h) return [];
        return detections.map((b) => {
            const mapped = mapBoxNormToUI(b, srcSize.W, srcSize.H, uiSize.w, uiSize.h);
            return {
                ...mapped,
                label: b.label || "Object",
                confidence: b.confidence || 0,
            };
        });
    }, [detections, uiSize, srcSize]);

    return (
        <div className="container">
            <h1>Camera Interface</h1>

            {/* Controls */}
            <div style={{ marginBottom: 12 }}>
                <label style={{ marginRight: 16 }}>
                    <input
                        type="checkbox"
                        checked={demo}
                        onChange={(e) => setDemo(e.target.checked)}
                    />{" "}
                    Demo mode (animate box)
                </label>
                <label>
                    Container width: {boxWidth}px
                    <input
                        type="range"
                        min="320"
                        max="1280"
                        step="10"
                        value={boxWidth}
                        onChange={(e) => setBoxWidth(parseInt(e.target.value, 10))}
                        style={{ marginLeft: 8, verticalAlign: "middle" }}
                    />
                </label>
            </div>

            {/* Camera selector */}
            <select onChange={(e) => setDeviceId(e.target.value)} value={deviceId || ""}>
                {devices.map((device, idx) => (
                    <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${idx + 1}`}
                    </option>
                ))}
            </select>

            {/* Video + overlay */}
            <div
                className="webcam-box"
                ref={containerRef}
                style={{ width: boxWidth + "px", maxWidth: "none" }}
            >
                <Webcam
                    className="webcam"
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ deviceId }}
                />
                <div className="overlay">
                    {mappedBoxes.map((b, i) => (
                        <div
                            key={i}
                            className="bbox"
                            style={{
                                left: b.X1,
                                top: b.Y1,
                                width: b.X2 - b.X1,
                                height: b.Y2 - b.Y1,
                            }}
                        >
                            <div className="bbox-label">
                                {b.label} {Math.round(b.confidence * 100)}%
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
