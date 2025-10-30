export interface ScriptIntegrity {
  hash: string;
  algorithm: string;
  timestamp: string;
  size: number;
}

export interface SignedScript {
  script: string;
  integrity: ScriptIntegrity;
  signature?: string; // Optional code signing signature
}

/**
 * Generate SHA-256 hash of a script
 */
export async function generateScriptHash(script: string): Promise<string> {
  if (!script) {
    return '';
  }

  try {
    // Convert string to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(script);
    
    // Generate SHA-256 hash
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // Convert to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Error generating hash:', error);
    return '';
  }
}

/**
 * Generate complete integrity information for a script
 */
export async function generateScriptIntegrity(script: string): Promise<ScriptIntegrity> {
  const hash = await generateScriptHash(script);
  
  return {
    hash,
    algorithm: 'SHA-256',
    timestamp: new Date().toISOString(),
    size: new Blob([script]).size
  };
}

/**
 * Create a signed script with integrity information
 */
export async function createSignedScript(script: string, includeSignature: boolean = false): Promise<SignedScript> {
  const integrity = await generateScriptIntegrity(script);
  
  const signedScript: SignedScript = {
    script,
    integrity
  };
  
  // Optional: Add code signing signature (placeholder for future implementation)
  if (includeSignature) {
    signedScript.signature = await generateCodeSignature(script, integrity.hash);
  }
  
  return signedScript;
}

/**
 * Generate a code signing signature (placeholder for certificate-based signing)
 */
async function generateCodeSignature(script: string, hash: string): Promise<string> {
  // This is a placeholder. Real code signing would require:
  // 1. A valid code signing certificate
  // 2. Private key access
  // 3. Proper cryptographic signing
  
  // For now, return a formatted signature block
  return `
# PSForge Code Signature
# Algorithm: SHA-256
# Hash: ${hash}
# Timestamp: ${new Date().toISOString()}
# Note: This is an integrity check, not a cryptographic signature.
# For production use, sign scripts with a valid code signing certificate.
`.trim();
}

/**
 * Verify script integrity by comparing hashes
 */
export async function verifyScriptIntegrity(script: string, expectedHash: string): Promise<boolean> {
  const actualHash = await generateScriptHash(script);
  return actualHash === expectedHash;
}

/**
 * Format integrity information for display
 */
export function formatIntegrityInfo(integrity: ScriptIntegrity): string {
  return `
# Script Integrity Information
# Generated: ${integrity.timestamp}
# Algorithm: ${integrity.algorithm}
# Hash: ${integrity.hash}
# Size: ${integrity.size} bytes
`.trim();
}

/**
 * Add integrity header to a PowerShell script
 */
export async function addIntegrityHeader(script: string): Promise<string> {
  const integrity = await generateScriptIntegrity(script);
  const header = formatIntegrityInfo(integrity);
  
  return `${header}\n\n${script}`;
}

/**
 * Extract integrity information from a script header
 */
export function extractIntegrityFromScript(script: string): ScriptIntegrity | null {
  const lines = script.split('\n');
  const integrityLines: string[] = [];
  
  let inIntegritySection = false;
  for (const line of lines) {
    if (line.includes('# Script Integrity Information')) {
      inIntegritySection = true;
      continue;
    }
    
    if (inIntegritySection) {
      if (line.trim() === '' || !line.startsWith('#')) {
        break;
      }
      integrityLines.push(line);
    }
  }
  
  if (integrityLines.length === 0) {
    return null;
  }
  
  // Parse integrity information
  const integrity: Partial<ScriptIntegrity> = {
    algorithm: 'SHA-256',
    timestamp: '',
    hash: '',
    size: 0
  };
  
  integrityLines.forEach(line => {
    const match = line.match(/# (\w+):\s*(.+)/);
    if (match) {
      const [, key, value] = match;
      switch (key.toLowerCase()) {
        case 'generated':
          integrity.timestamp = value;
          break;
        case 'hash':
          integrity.hash = value;
          break;
        case 'size':
          integrity.size = parseInt(value.replace(/\D/g, ''));
          break;
      }
    }
  });
  
  if (integrity.hash && integrity.timestamp) {
    return integrity as ScriptIntegrity;
  }
  
  return null;
}

/**
 * Format hash for display (shortened version)
 */
export function formatHashForDisplay(hash: string, length: number = 16): string {
  if (!hash || hash.length <= length) {
    return hash;
  }
  
  const half = Math.floor(length / 2);
  return `${hash.substring(0, half)}...${hash.substring(hash.length - half)}`;
}

/**
 * Copy hash to clipboard
 */
export async function copyHashToClipboard(hash: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(hash);
    return true;
  } catch (error) {
    console.error('Failed to copy hash:', error);
    return false;
  }
}
