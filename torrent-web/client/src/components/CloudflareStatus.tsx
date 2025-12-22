import { useState, useEffect, useCallback } from "preact/hooks";

interface WarmupStatus {
  status: "idle" | "warming_up" | "ready" | "error";
  message: string;
  attempt?: number;
  maxAttempts?: number;
  cookiesValid?: boolean;
}

interface CloudflareStatusProps {
  onReady?: () => void;
}

const TOOLTIP_TEXT = `1337x.to uses Cloudflare bot protection.
This indicator shows the connection status.
When warming up, a browser opens briefly to bypass Cloudflare.
Cookies are cached for 30 minutes.`;

export function CloudflareStatus({ onReady }: CloudflareStatusProps) {
  const [status, setStatus] = useState<WarmupStatus>({
    status: "idle",
    message: "Checking 1337x..."
  });
  const [showTooltip, setShowTooltip] = useState(false);

  const startWarmup = useCallback(() => {
    setStatus({
      status: "warming_up",
      message: "Connecting...",
      attempt: 1,
      maxAttempts: 3
    });

    // Use Server-Sent Events for real-time updates
    const eventSource = new EventSource("/api/1337x/warmup-stream");

    eventSource.onmessage = (event) => {
      try {
        const data: WarmupStatus = JSON.parse(event.data);
        setStatus(data);

        if (data.status === "ready") {
          onReady?.();
        }
      } catch (e) {
        console.error("[CloudflareStatus] Failed to parse SSE data:", e);
      }
    };

    eventSource.addEventListener("done", () => {
      eventSource.close();
    });

    eventSource.onerror = () => {
      eventSource.close();
      setStatus((prev) => {
        if (prev.status !== "ready") {
          return {
            status: "error",
            message: "Connection failed",
            cookiesValid: false
          };
        }
        return prev;
      });
    };

    return () => {
      eventSource.close();
    };
  }, [onReady]);

  // Start warmup on mount
  useEffect(() => {
    const cleanup = startWarmup();
    return cleanup;
  }, [startWarmup]);

  const handleRetry = () => {
    startWarmup();
  };

  const getStatusColor = () => {
    switch (status.status) {
      case "ready":
        return "cf-badge-ready";
      case "warming_up":
        return "cf-badge-warming";
      case "error":
        return "cf-badge-error";
      default:
        return "cf-badge-idle";
    }
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case "ready":
        return "●";
      case "warming_up":
        return null; // Will show spinner
      case "error":
        return "●";
      default:
        return "○";
    }
  };

  return (
    <div
      class={`cf-badge ${getStatusColor()}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {status.status === "warming_up" ? (
        <div class="cf-badge-spinner" />
      ) : (
        <span class="cf-badge-dot">{getStatusIcon()}</span>
      )}
      <span class="cf-badge-label">1337x</span>
      {status.status === "error" && (
        <button class="cf-badge-retry" onClick={handleRetry} title="Retry connection">
          ↻
        </button>
      )}
      {showTooltip && (
        <div class="cf-badge-tooltip">
          {TOOLTIP_TEXT}
        </div>
      )}
    </div>
  );
}
