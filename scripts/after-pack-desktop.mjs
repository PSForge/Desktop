import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export default async function afterPack(context) {
  if (context.electronPlatformName !== "win32") {
    return;
  }

  const projectRoot = context.packager.projectDir;
  const rceditPath = path.join(projectRoot, "node_modules", "electron-winstaller", "vendor", "rcedit.exe");
  const iconPath = path.join(projectRoot, "build", "icon.ico");
  const productFilename = context.packager.appInfo.productFilename || context.packager.appInfo.productName;
  const executablePath = path.join(context.appOutDir, `${productFilename}.exe`);

  await fs.access(rceditPath);
  await fs.access(iconPath);
  await fs.access(executablePath);

  await execFileAsync(rceditPath, [
    executablePath,
    "--set-icon",
    iconPath,
    "--set-file-version",
    context.packager.appInfo.version,
    "--set-product-version",
    context.packager.appInfo.version,
    "--set-version-string",
    "FileDescription",
    "PSForge Desktop",
    "--set-version-string",
    "ProductName",
    "PSForge Desktop",
    "--set-version-string",
    "CompanyName",
    "IsaiahBlacknall LLC",
    "--set-version-string",
    "InternalName",
    "PSForge Desktop",
    "--set-version-string",
    "OriginalFilename",
    "PSForge Desktop.exe",
  ]);
}
