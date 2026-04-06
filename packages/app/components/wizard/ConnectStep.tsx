"use client";

import { useState } from "react";

interface ConnectStepProps {
  onNext: (data: { url: string; token: string; useDemoData: boolean }) => void;
}

export function ConnectStep({ onNext }: ConnectStepProps) {
  const [url, setUrl] = useState("ws://localhost:4040");
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function testConnection() {
    setTesting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/gateway/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, token }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(true);
      } else {
        setError(data.error ?? "Connection failed");
      }
    } catch {
      setError("Failed to reach test endpoint");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2>Connect to Gateway</h2>
      <p style={{ color: "#999", marginBottom: 24 }}>
        Enter your OpenClaw gateway URL and token to connect.
      </p>

      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Gateway URL</span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="ws://localhost:4040"
          style={inputStyle}
        />
      </label>

      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Token (optional)</span>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="$OPENCLAW_TOKEN"
          style={inputStyle}
        />
      </label>

      {error && <p style={{ color: "#ff6b6b", fontSize: 14 }}>{error}</p>}
      {success && <p style={{ color: "#6bff6b", fontSize: 14 }}>Connected successfully!</p>}

      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <button onClick={testConnection} disabled={testing} style={buttonSecondary}>
          {testing ? "Testing..." : "Test Connection"}
        </button>
        <button
          onClick={() => onNext({ url, token, useDemoData: false })}
          disabled={!success}
          style={success ? buttonPrimary : buttonDisabled}
        >
          Next
        </button>
      </div>

      <div style={{ marginTop: 32, borderTop: "1px solid #333", paddingTop: 16 }}>
        <button
          onClick={() => onNext({ url: "", token: "", useDemoData: true })}
          style={{ ...buttonSecondary, fontSize: 13 }}
        >
          Use Demo Data Instead
        </button>
        <p style={{ color: "#666", fontSize: 12, marginTop: 8 }}>
          Skip gateway connection and use sample agents for a preview.
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#1a2030",
  border: "1px solid #333",
  borderRadius: 6,
  color: "#e0e0e0",
  fontSize: 14,
  outline: "none",
};

const buttonPrimary: React.CSSProperties = {
  padding: "10px 24px",
  background: "#8090c0",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
};

const buttonSecondary: React.CSSProperties = {
  padding: "10px 24px",
  background: "transparent",
  color: "#8090c0",
  border: "1px solid #8090c0",
  borderRadius: 6,
  fontSize: 14,
};

const buttonDisabled: React.CSSProperties = {
  ...buttonPrimary,
  background: "#333",
  color: "#666",
  cursor: "not-allowed",
};
