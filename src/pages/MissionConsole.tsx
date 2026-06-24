import { useEffect, useRef, useState } from "react";
import LazyTelemetryChart from "../components/LazyTelemetryChart";
import { API_URL } from "../utils/constants";

type Telemetry = {
  missionId: string;
  altitude?: number;
  speed?: number;
  temperature?: number;
  status: string;
  timestamp: number;
  videoTime?: number;
};

const API_BASE = API_URL;

export default function MissionConsole() {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [history, setHistory] = useState<
    { altitude: number; speed: number; videoTime: number }[]
  >([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // ✅ Defer telemetry polling until user interacts with page
  // This reduces network activity and CPU on app load
  useEffect(() => {
    const handleUserInteraction = () => {
      setHasUserInteracted(true);
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("scroll", handleUserInteraction);
    };

    document.addEventListener("click", handleUserInteraction);
    document.addEventListener("scroll", handleUserInteraction);

    return () => {
      document.removeEventListener("click", handleUserInteraction);
      document.removeEventListener("scroll", handleUserInteraction);
    };
  }, []);

  // ✅ Lazy poll telemetry only when user interacts or after 3s
  useEffect(() => {
    if (!hasUserInteracted) {
      const timeoutId = setTimeout(() => setHasUserInteracted(true), 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [hasUserInteracted]);

  // ─────────────────────────────────────────────
  // Fetch telemetry (only when user interacts)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!hasUserInteracted) return;

    const fetchTelemetry = () => {
      fetch(`${API_BASE}/mission/telemetry`)
        .then((res) => res.json())
        .then((data) => {
          const videoTime = videoRef.current?.currentTime || 0;

          const syncedData = {
            ...data,
            videoTime,
          };

          setTelemetry(syncedData);
          setLoading(false);

          // Store history (last 30 points)
          if (
            syncedData.altitude !== undefined &&
            syncedData.speed !== undefined
          ) {
            setHistory((prev) => [
              ...prev.slice(-29),
              {
                altitude: syncedData.altitude,
                speed: syncedData.speed,
                videoTime,
              },
            ]);
          }

          // Alerts
          if (syncedData.altitude !== undefined && syncedData.altitude < 300) {
            setAlerts((prev) => [...prev, "⚠️ Altitude too low"]);
          }

          if (syncedData.speed !== undefined && syncedData.speed > 120) {
            setAlerts((prev) => [...prev, "⚠️ Overspeed detected"]);
          }
        })
        .catch((err) => console.error("Telemetry fetch failed", err));
    };

    fetchTelemetry();
    // ✅ Reduced polling interval from 2s to 5s to save network/CPU
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, [hasUserInteracted]);

  // -----------------------------
  // Mission controls
  // -----------------------------
  const startMission = () =>
    fetch(`${API_BASE}/mission/start`, { method: "POST" });

  const stopMission = () =>
    fetch(`${API_BASE}/mission/stop`, { method: "POST" });

  const replayMission = async () => {
    const res = await fetch(`${API_BASE}/mission/replay`);
    const data = await res.json();
    setHistory(
      data.map((d: any) => ({
        altitude: d.altitude,
        speed: d.speed,
        videoTime: 0,
      }))
    );
  };

  if (loading || !telemetry) {
    return <div style={styles.container}>Loading Mission…</div>;
  }

  return (
    <div style={styles.container}>
      <h2>🚀 Mission Console</h2>

      {/* VIDEO */}
      <video
        ref={videoRef}
        src="https://www.w3schools.com/html/mov_bbb.mp4"
        controls
        width="600"
        style={{ marginBottom: 20 }}
      />

      {/* CONTROLS */}
      <div style={{ marginBottom: 20 }}>
        <button style={styles.startBtn} onClick={startMission}>
          ▶ Start
        </button>
        <button style={styles.stopBtn} onClick={stopMission}>
          ⏹ Stop
        </button>
        <button style={styles.replayBtn} onClick={replayMission}>
          🔁 Replay
        </button>
      </div>

      {/* INFO */}
      <p><b>Mission:</b> {telemetry.missionId}</p>
      <p><b>Status:</b> {telemetry.status}</p>
      <p><b>Video Time:</b> {telemetry.videoTime?.toFixed(1)} sec</p>

      {/* CARDS */}
      <div style={styles.cards}>
        <Card label="Altitude" value={`${telemetry.altitude} m`} />
        <Card label="Speed" value={`${telemetry.speed} m/s`} />
        <Card label="Temp" value={`${telemetry.temperature} °C`} />
      </div>

      {/* GRAPH */}
      <LazyTelemetryChart data={history} />

      {/* ALERTS */}
      {alerts.length > 0 && (
        <div style={styles.alertBox}>
          <h4>🚨 Alerts</h4>
          <ul>
            {alerts.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// -----------------------------
// Small Components
// -----------------------------
function Card({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.card}>
      <div style={{ opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 18 }}>{value}</div>
    </div>
  );
}

// -----------------------------
// Styles
// -----------------------------
const styles: any = {
  container: {
    padding: 20,
    background: "#0b1220",
    color: "white",
    minHeight: "100vh",
  },
  cards: {
    display: "flex",
    gap: 20,
    marginTop: 20,
  },
  card: {
    background: "#111827",
    padding: 16,
    borderRadius: 10,
    minWidth: 140,
    textAlign: "center",
  },
  startBtn: { background: "green", color: "white", marginRight: 10 },
  stopBtn: { background: "red", color: "white", marginRight: 10 },
  replayBtn: { background: "#2563eb", color: "white" },
  alertBox: {
    marginTop: 20,
    background: "#7f1d1d",
    padding: 12,
    borderRadius: 8,
  },
};

