const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

if (process.platform !== "linux") {
  process.exit(0);
}

const appDir = path.join(__dirname, "..");
const rootDir = path.join(appDir, "../..");

const NATIVE_PACKAGES = [
  { name: "lightningcss-linux-x64-gnu", version: "1.32.0" },
  { name: "@tailwindcss/oxide-linux-x64-gnu", version: "4.3.2" },
];

function ensureInDirectory(directory) {
  for (const { name, version } of NATIVE_PACKAGES) {
    try {
      require.resolve(name, { paths: [directory] });
    } catch {
      execSync(`npm install ${name}@${version} --no-save --no-package-lock`, {
        cwd: directory,
        stdio: "inherit",
      });
    }
  }
}

for (const directory of [rootDir, appDir]) {
  if (fs.existsSync(path.join(directory, "package.json"))) {
    ensureInDirectory(directory);
  }
}
