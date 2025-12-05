// src/utils/getCountry.ts
export async function getCountryCode(): Promise<string> {
  try {
    // Cloudflare edge service gives fast country detection
    const res = await fetch("https://ipapi.co/country/", { cache: "no-store" });
    if (!res.ok) return "US"; // fallback
    const code = await res.text();
    return code.trim().toUpperCase();
  } catch {
    return "US"; // fallback
  }
}
