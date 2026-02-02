import { exec, execSync } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Configuration
const WG_INTERFACE = process.env.WG_INTERFACE || "wg0";
const VPN_REQUIRED = process.env.VPN_REQUIRED !== "false"; // default true
const VPN_CHECK_INTERVAL = parseInt(process.env.VPN_CHECK_INTERVAL || "30000", 10);

export interface VpnStatus {
  connected: boolean;
  interface: string;
  publicIp?: string;
  endpoint?: string;
  latestHandshake?: string;
  transferRx?: string;
  transferTx?: string;
  error?: string;
}

// Cached connection state for fast synchronous checks
let vpnConnected = false;
let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Check if wg and wg-quick are installed.
 */
export function checkWireGuardInstalled(): boolean {
  try {
    execSync("which wg", { stdio: "ignore" });
    execSync("which wg-quick", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get detailed VPN status by running `sudo wg show <interface>` and fetching public IP.
 */
export async function getVpnStatus(): Promise<VpnStatus> {
  try {
    const { stdout } = await execAsync(`sudo wg show ${WG_INTERFACE}`);

    if (!stdout.trim()) {
      vpnConnected = false;
      return { connected: false, interface: WG_INTERFACE };
    }

    // Parse wg show output
    const endpointMatch = stdout.match(/endpoint:\s+(\S+)/);
    const handshakeMatch = stdout.match(/latest handshake:\s+(.+)/);
    const transferMatch = stdout.match(/transfer:\s+(\S+ \S+) received, (\S+ \S+) sent/);

    vpnConnected = true;

    const status: VpnStatus = {
      connected: true,
      interface: WG_INTERFACE,
      endpoint: endpointMatch?.[1],
      latestHandshake: handshakeMatch?.[1],
      transferRx: transferMatch?.[1],
      transferTx: transferMatch?.[2]
    };

    // Fetch public IP (best-effort, don't fail if unavailable)
    try {
      const { stdout: ip } = await execAsync("curl -s --max-time 5 https://api.ipify.org");
      status.publicIp = ip.trim();
    } catch {
      // Public IP fetch failed — non-critical
    }

    return status;
  } catch (error) {
    vpnConnected = false;
    const message = error instanceof Error ? error.message : String(error);

    // "unable to access interface" means it's not up — not an error per se
    if (message.includes("Unable to access interface") || message.includes("No such device")) {
      return { connected: false, interface: WG_INTERFACE };
    }

    return { connected: false, interface: WG_INTERFACE, error: message };
  }
}

/**
 * Fast synchronous check using cached state.
 */
export function isVpnActive(): boolean {
  return vpnConnected;
}

/**
 * Whether VPN enforcement is enabled.
 */
export function isVpnRequired(): boolean {
  return VPN_REQUIRED;
}

/**
 * Connect VPN via `sudo wg-quick up <interface>`. No-ops if already connected.
 */
export async function connectVpn(): Promise<VpnStatus> {
  // Check if already connected
  const currentStatus = await getVpnStatus();
  if (currentStatus.connected) {
    console.log(`[VPN] Already connected on ${WG_INTERFACE}`);
    return currentStatus;
  }

  try {
    console.log(`[VPN] Connecting ${WG_INTERFACE}...`);
    await execAsync(`sudo wg-quick up ${WG_INTERFACE}`);
    console.log(`[VPN] Connected ${WG_INTERFACE}`);

    // Refresh status after connecting
    return await getVpnStatus();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // "already exists" means it's already up
    if (message.includes("already exists")) {
      console.log(`[VPN] Interface ${WG_INTERFACE} already exists`);
      vpnConnected = true;
      return await getVpnStatus();
    }

    console.error(`[VPN] Failed to connect: ${message}`);
    vpnConnected = false;
    return { connected: false, interface: WG_INTERFACE, error: message };
  }
}

/**
 * Disconnect VPN via `sudo wg-quick down <interface>`.
 */
export async function disconnectVpn(): Promise<VpnStatus> {
  try {
    console.log(`[VPN] Disconnecting ${WG_INTERFACE}...`);
    await execAsync(`sudo wg-quick down ${WG_INTERFACE}`);
    console.log(`[VPN] Disconnected ${WG_INTERFACE}`);
    vpnConnected = false;
    return { connected: false, interface: WG_INTERFACE };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // "is not a WireGuard interface" means it's already down
    if (message.includes("is not a WireGuard interface")) {
      vpnConnected = false;
      return { connected: false, interface: WG_INTERFACE };
    }

    console.error(`[VPN] Failed to disconnect: ${message}`);
    return { connected: false, interface: WG_INTERFACE, error: message };
  }
}

/**
 * Start periodic health check. Calls `onDrop` when VPN connection is lost.
 */
export function startHealthCheck(onDrop: () => void): void {
  if (healthCheckTimer) {
    console.log("[VPN] Health check already running");
    return;
  }

  console.log(`[VPN] Starting health check every ${VPN_CHECK_INTERVAL}ms`);

  healthCheckTimer = setInterval(async () => {
    const status = await getVpnStatus();

    if (!status.connected && vpnConnected) {
      // State just transitioned from connected to disconnected
      console.error("[VPN] Kill switch activated — VPN connection lost!");
      onDrop();
    } else if (status.connected && !vpnConnected) {
      console.log("[VPN] Connection recovered");
    }

    vpnConnected = status.connected;
  }, VPN_CHECK_INTERVAL);
}

/**
 * Stop the periodic health check.
 */
export function stopHealthCheck(): void {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
    console.log("[VPN] Health check stopped");
  }
}
