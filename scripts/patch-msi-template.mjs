import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const templatePath = path.join(repoRoot, "node_modules", "app-builder-lib", "templates", "msi", "template.xml");

async function patchMsiTemplate() {
  const original = await fs.readFile(templatePath, "utf8");
  if (original.includes("CleanupApplicationFolder")) {
    console.log("MSI template already patched.");
    return;
  }

  let next = original.replace(
    `    <Feature Id="ProductFeature" Absent="disallow">
      <ComponentGroupRef Id="ProductComponents"/>
    </Feature>`,
    `    <Feature Id="ProductFeature" Absent="disallow">
      <ComponentGroupRef Id="ProductComponents"/>
      <ComponentGroupRef Id="CleanupApplicationFolder"/>
    </Feature>`,
  );

  next = next.replace(
    `    <ComponentGroup Id="ProductComponents" Directory="APPLICATIONFOLDER">
      {{-files}}
    </ComponentGroup>`,
    `    <ComponentGroup Id="ProductComponents" Directory="APPLICATIONFOLDER">
      {{-files}}
    </ComponentGroup>

    <ComponentGroup Id="CleanupApplicationFolder" Directory="APPLICATIONFOLDER">
      <Component Id="CleanupApplicationFolderComponent" Guid="{7D73365D-1A7B-4B43-9F8F-74B0D0A7C5E1}" KeyPath="yes">
        <CreateFolder/>
        <RemoveFolder Id="RemoveApplicationFolder" Directory="APPLICATIONFOLDER" On="uninstall"/>
      </Component>
    </ComponentGroup>`,
  );

  await fs.writeFile(templatePath, next, "utf8");
  console.log(`Patched MSI template at ${templatePath}`);
}

patchMsiTemplate().catch((error) => {
  console.error("Failed to patch MSI template:", error);
  process.exitCode = 1;
});
