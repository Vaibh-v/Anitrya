/**
 * Google APIs occasionally answer with HTML/text (proxy errors, 502s, quota
 * pages). `response.json()` then throws an opaque SyntaxError. This reads the
 * body once and turns a non-JSON body into an explainable error.
 */
export async function readGoogleJson<T>(response: Response, label: string): Promise<T> {
  const body = await response.text();

  try {
    return (body ? JSON.parse(body) : {}) as T;
  } catch {
    throw new Error(
      `${label} returned a non-JSON response (HTTP ${response.status}).`,
    );
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Guards values that are interpolated into GAQL / SQL date literals. */
export function assertIsoDateRange(from: string, to: string, label: string) {
  if (!isValidIsoDate(from) || !isValidIsoDate(to) || from > to) {
    throw new Error(`${label}: from/to must be valid YYYY-MM-DD dates with from <= to.`);
  }
}
