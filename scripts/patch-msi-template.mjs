import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const templatePath = path.join(repoRoot, "node_modules", "app-builder-lib", "templates", "msi", "template.xml");

const cleanupFeatureRef = `      <ComponentGroupRef Id="CleanupApplicationFolder"/>`;
const cleanupComponentGroup = `    <ComponentGroup Id="CleanupApplicationFolder" Directory="APPLICATIONFOLDER">
      <Component Id="CleanupApplicationFolderComponent" Guid="{7D73365D-1A7B-4B43-9F8F-74B0D0A7C5E1}">
        <CreateFolder/>
        <RemoveFolder Id="RemoveApplicationFolder" Directory="APPLICATIONFOLDER" On="uninstall"/>
        <RegistryValue Root="HKMU" Key="Software\\PSForgeDesktop" Name="CleanupApplicationFolder" Type="integer" Value="1" KeyPath="yes"/>
      </Component>
    </ComponentGroup>`;

const legacyCleanupPattern = /    <ComponentGroup Id="CleanupApplicationFolder" Directory="APPLICATIONFOLDER">[\s\S]*?    <\/ComponentGroup>/;

async function patchMsiTemplate() {
  const original = await fs.readFile(templatePath, "utf8");
  let next = original;

  if (!next.includes(cleanupFeatureRef)) {
    next = next.replace(
      `    <Feature Id="ProductFeature" Absent="disallow">
      <ComponentGroupRef Id="ProductComponents"/>
    </Feature>`,
      `    <Feature Id="ProductFeature" Absent="disallow">
      <ComponentGroupRef Id="ProductComponents"/>
${cleanupFeatureRef}
    </Feature>`,
    );
  }

  if (legacyCleanupPattern.test(next)) {
    next = next.replace(legacyCleanupPattern, cleanupComponentGroup);
  } else {
    next = next.replace(
      `    <ComponentGroup Id="ProductComponents" Directory="APPLICATIONFOLDER">
      {{-files}}
    </ComponentGroup>`,
      `    <ComponentGroup Id="ProductComponents" Directory="APPLICATIONFOLDER">
      {{-files}}
    </ComponentGroup>

${cleanupComponentGroup}`,
    );
  }

  if (next === original) {
    console.log("MSI template already patched.");
    return;
  }

  await fs.writeFile(templatePath, next, "utf8");
  console.log(`Patched MSI template at ${templatePath}`);
}

patchMsiTemplate().catch((error) => {
  console.error("Failed to patch MSI template:", error);
  process.exitCode = 1;
});
