import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup } from '@angular/forms';

export interface ParsedApiError {
  code?: string;
  message: string;
  fields: Record<string, string>;
}

export function parseApiError(err: unknown): ParsedApiError {
  const fallback = 'Something went wrong. Please try again.';

  if (!(err instanceof HttpErrorResponse)) {
    return { message: fallback, fields: {} };
  }
  if (err.status === 0) {
    return { message: 'Cannot reach the server. Is the backend running?', fields: {} };
  }

  // Bentuk backend: { error: { code, message, status, timestamp, ... } }
  const body = err.error;
  const e = body?.error ?? body;
  const message = typeof e?.message === 'string' ? e.message : fallback;
  const code = typeof e?.code === 'string' ? e.code : undefined;

  // Error validasi per field (bentuknya belum saya lihat, jadi dibaca longgar)
  const fields: Record<string, string> = {};
  const raw = e?.errors ?? e?.fieldErrors ?? e?.details;
  if (Array.isArray(raw)) {
    raw.forEach((x) => x?.field && (fields[x.field] = x.message));
  } else if (raw && typeof raw === 'object') {
    Object.entries(raw).forEach(
      ([k, v]) => (fields[k] = Array.isArray(v) ? v.join(', ') : String(v)),
    );
  }

  return { code, message, fields };
}

/** Puts field-level server messages onto matching form controls. Returns true if any matched. */
export function applyFieldErrors(form: FormGroup, fields: Record<string, string>): boolean {
  let matched = false;
  for (const [name, msg] of Object.entries(fields)) {
    const control: AbstractControl | null = form.get(name);
    if (control) {
      control.setErrors({ server: msg });
      control.markAsTouched();
      matched = true;
    }
  }
  return matched;
}
