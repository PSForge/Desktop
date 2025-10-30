export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Parse CSV text into structured data
 */
export function parseCSV(csvText: string): ParsedCSV {
  if (!csvText || csvText.trim() === '') {
    return { headers: [], rows: [] };
  }

  const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
  
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  
  // Parse rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length > 0) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line handling quotes properly
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quotes
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

/**
 * Convert structured data to CSV text
 */
export function toCSV(headers: string[], rows: Record<string, string>[]): string {
  const lines: string[] = [];
  
  // Add headers
  lines.push(headers.map(h => escapeCSVValue(h)).join(','));
  
  // Add rows
  rows.forEach(row => {
    const values = headers.map(header => escapeCSVValue(row[header] || ''));
    lines.push(values.join(','));
  });

  return lines.join('\n');
}

/**
 * Escape a CSV value (add quotes if needed)
 */
function escapeCSVValue(value: string): string {
  if (!value) return '';
  
  // Add quotes if value contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // Escape existing quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return value;
}

/**
 * Validate CSV data against expected parameters
 */
export function validateCSVData(
  data: ParsedCSV,
  requiredColumns: string[],
  optionalColumns: string[] = []
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for empty data
  if (data.headers.length === 0) {
    errors.push('CSV file is empty or has no headers');
    return { isValid: false, errors, warnings };
  }

  if (data.rows.length === 0) {
    errors.push('CSV file has no data rows');
    return { isValid: false, errors, warnings };
  }

  // Check for required columns
  const missingColumns = requiredColumns.filter(col => !data.headers.includes(col));
  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Check for empty values in required columns
  data.rows.forEach((row, index) => {
    requiredColumns.forEach(col => {
      if (!row[col] || row[col].trim() === '') {
        warnings.push(`Row ${index + 1}: Missing value for required column "${col}"`);
      }
    });
  });

  // Check for unrecognized columns
  const allExpectedColumns = [...requiredColumns, ...optionalColumns];
  const unrecognizedColumns = data.headers.filter(h => !allExpectedColumns.includes(h));
  if (unrecognizedColumns.length > 0) {
    warnings.push(`Unrecognized columns will be ignored: ${unrecognizedColumns.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate CSV template for given parameters
 */
export function generateCSVTemplate(columns: string[], includeExample: boolean = true): string {
  const headers = columns;
  const rows: Record<string, string>[] = [];

  if (includeExample) {
    // Add an example row
    const exampleRow: Record<string, string> = {};
    columns.forEach(col => {
      exampleRow[col] = `example_${col.toLowerCase()}`;
    });
    rows.push(exampleRow);
  }

  return toCSV(headers, rows);
}

/**
 * Download CSV as a file
 */
export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Read CSV file from FileList
 */
export async function readCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };
    reader.readAsText(file);
  });
}
