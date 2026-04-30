"use client";
import { useState } from "react";

export default function FitnessSyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ fitnessBoost?: number; valid?: boolean } | null>(null);

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fitness/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setResult({
          fitnessBoost: Math.round(Number(data.summary?.fitnessBoost ?? 0) * 100),
          valid: data.summary?.valid ?? false,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        id="fitness-sync-btn"
        className="btn btn-secondary"
        style={{ width: "100%" }}
        onClick={handleSync}
        disabled={loading}
      >
        {loading ? "Syncing..." : "🔄 Sync Today's Fitness Data"}
      </button>
      {result && (
        <p style={{ margin: "8px 0 0", fontSize: "13px", textAlign: "center" }}>
          {result.valid
            ? <span className="badge badge-teal">✓ Synced! +{result.fitnessBoost}% boost ready</span>
            : <span className="badge badge-orange">⚠️ No qualifying workout today</span>}
        </p>
      )}
    </div>
  );
}
