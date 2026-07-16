const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const root = path.resolve(__dirname, "..");
const frontendRoot = path.join(root, "frontend", "Facebook_Frontend");
const viteBin = path.join(frontendRoot, "node_modules", "vite", "bin", "vite.js");
const apiProject = path.join(root, "backend", "src", "FacebookClone.API", "FacebookClone.API.csproj");
const backendConfiguration = "Release";
const apiOutputDir = path.join(root, "backend", "src", "FacebookClone.API", "bin", backendConfiguration, "net10.0");

const children = [];
let shuttingDown = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function prefixStream(stream, name) {
  const rl = readline.createInterface({ input: stream });
  rl.on("line", (line) => {
    process.stdout.write(`[${name}] ${line}\n`);
  });
}

function spawnProcess(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? root,
    env: {
      ...process.env,
      DOTNET_WATCH_SUPPRESS_LAUNCH_BROWSER: "1",
      ...options.env,
    },
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  children.push({ name, child });
  prefixStream(child.stdout, name);
  prefixStream(child.stderr, name);

  child.on("error", (error) => {
    process.stderr.write(`[${name}] Failed to start: ${error.message}\n`);
    shutdown(1);
  });

  child.on("exit", (code, signal) => {
    if (shuttingDown) return;

    const reason = signal ? `signal ${signal}` : `code ${code}`;
    process.stderr.write(`[${name}] exited with ${reason}\n`);
    shutdown(code || 1);
  });

  return child;
}

function runStep(name, command, args, options = {}) {
  process.stdout.write(`[DEV] ${name}...\n`);
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...options.env },
    shell: false,
    windowsHide: true,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.stderr.write(`[DEV] ${name} failed with code ${result.status ?? "unknown"}.\n`);
    process.exit(result.status || 1);
  }
}

function unblockBackendOutputs() {
  if (process.platform !== "win32" || !fs.existsSync(apiOutputDir)) return;

  spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Get-ChildItem -LiteralPath $args[0] -Recurse -Include *.dll,*.exe -File | Unblock-File",
      apiOutputDir,
    ],
    {
      cwd: root,
      shell: false,
      windowsHide: true,
      stdio: "ignore",
    }
  );
}

function killTree(pid, force = false) {
  if (process.platform === "win32") {
    return new Promise((resolve) => {
      const args = ["/pid", String(pid), "/t"];
      if (force) args.push("/f");

      const killer = spawn("taskkill", args, {
        stdio: "ignore",
        windowsHide: true,
      });

      killer.on("close", resolve);
      killer.on("error", resolve);
    });
  }

  try {
    process.kill(-pid, force ? "SIGKILL" : "SIGTERM");
  } catch {
    try {
      process.kill(pid, force ? "SIGKILL" : "SIGTERM");
    } catch {
      // Process is already gone.
    }
  }

  return Promise.resolve();
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  process.stdout.write("\n[DEV] Stopping backend and frontend...\n");

  if (process.platform === "win32") {
    // Ctrl+C is delivered to console children too. Give dotnet watch and Vite
    // a moment to shut down cleanly before using taskkill as a fallback.
    await wait(1500);
  }

  await Promise.all(
    children
      .filter(({ child }) => child.exitCode === null && child.signalCode === null)
      .map(({ child }) => killTree(child.pid, false))
  );

  await wait(1500);
  await Promise.all(
    children
      .filter(({ child }) => child.exitCode === null && child.signalCode === null)
      .map(({ child }) => killTree(child.pid, true))
  );

  process.stdout.write("[DEV] All dev processes stopped.\n");
  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
process.on("SIGHUP", () => shutdown(0));

if (!fs.existsSync(apiProject)) {
  process.stderr.write(`[DEV] Missing backend project: ${apiProject}\n`);
  process.exit(1);
}

if (!fs.existsSync(viteBin)) {
  process.stderr.write(`[DEV] Missing Vite binary: ${viteBin}\n`);
  process.stderr.write("[DEV] Run `npm --prefix frontend/Facebook_Frontend install` first.\n");
  process.exit(1);
}

runStep(`Building backend once (${backendConfiguration})`, "dotnet", ["build", apiProject, "-c", backendConfiguration]);
unblockBackendOutputs();

spawnProcess("BE", "dotnet", ["watch", "--project", apiProject, "run", "--no-build", "-c", backendConfiguration]);
spawnProcess("FE", process.execPath, [viteBin], { cwd: frontendRoot });
