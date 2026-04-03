/**
 * R2/Blob storage configuration and utilities
 */

export function getPublicBlobUrl(url: string): string {
  // If URL already has a domain, return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  // Relative URLs: prepend public domain
  const publicUrl = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_APP_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
  }
  return url;
}

export function isLocalhost(): boolean {
  const url =
    process.env.NEXT_PUBLIC_APP_LOCAL_URL || process.env.APP_BASE_URL || "";
  return url.includes("localhost") || url.includes("127.0.0.1");
}
