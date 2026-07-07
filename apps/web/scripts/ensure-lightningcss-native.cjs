const { execSync } = require("child_process");
const path = require("path");

if (process.platform !== "linux") {
  process.exit(0);
}

try {
  require.resolve("lightningcss-linux-x64-gnu");
  process.exit(0);
} catch {
  execSync("npm install lightningcss-linux-x64-gnu@1.32.0 --no-save --no-package-lock", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
}
