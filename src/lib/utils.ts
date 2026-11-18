import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTimeShort(isoOrTime: string): string {
  if (!isoOrTime) return '—';
  if (/^\d{2}:\d{2}/.test(isoOrTime)) return isoOrTime;
  const parsed = new Date(isoOrTime);
  if (Number.isNaN(parsed.getTime())) return isoOrTime;
  return parsed.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function exportToCsv(filename: string, rows: Array<Record<string, string | number | boolean | null | undefined>>): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const val = row[key] ?? '';
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    ),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function compressImagePreview(file: File): Promise<{
  name: string;
  sizeBytes: number;
  compressedBytes: number;
  dataUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1024;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            name: file.name,
            sizeBytes: file.size,
            compressedBytes: file.size,
            dataUrl: String(reader.result),
          });
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedUrl = canvas.toDataURL('image/jpeg', 0.72);
        const approxBytes = Math.round((compressedUrl.length * 3) / 4);
        resolve({
          name: file.name,
          sizeBytes: file.size,
          compressedBytes: approxBytes,
          dataUrl: compressedUrl,
        });
      };
      img.onerror = () => {
        resolve({
          name: file.name,
          sizeBytes: file.size,
          compressedBytes: file.size,
          dataUrl: String(reader.result),
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
