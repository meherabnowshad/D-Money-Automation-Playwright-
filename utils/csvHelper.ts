import * as fs from 'fs';
import * as path from 'path';

export class CsvHelper {
  static writeTableToCsv(filePath: string, headers: string[], rows: string[][]): void {
    const formatCell = (val: string) => {
      const cleaned = (val || '').trim().replace(/\s+/g, ' ');
      if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n')) {
        return `"${cleaned.replace(/"/g, '""')}"`;
      }
      return cleaned;
    };

    const lines: string[] = [];
    if (headers && headers.length > 0) {
      lines.push(headers.map(formatCell).join(','));
    }
    for (const row of rows) {
      lines.push(row.map(formatCell).join(','));
    }

    const resolvedPath = path.resolve(filePath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, lines.join('\n'), 'utf-8');
  }

  static fileExists(filePath: string): boolean {
    return fs.existsSync(path.resolve(filePath));
  }

  static readCsv(filePath: string): string {
    return fs.readFileSync(path.resolve(filePath), 'utf-8');
  }
}

