// Builds Supabase Storage public URLs from bare filenames.
// The project URL is read from the existing env variable so no hardcoding is needed.

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

// If the URL is missing or a placeholder, storage URLs cannot be constructed.
const storageBase = SUPABASE_URL && !SUPABASE_URL.includes('xyz.supabase.co')
  ? `${SUPABASE_URL}/storage/v1/object/public`
  : null;

/** Converts a bare filename (e.g. "manifest.txt") to its full public URL in the Manifest bucket */
export const resolveManifestUrl = (filename: string | null | undefined): string | null => {
  if (!filename || !storageBase) return null;
  const name = filename.trim();
  if (!name) return null;
  // If already a full URL, pass through unchanged
  if (name.startsWith('http://') || name.startsWith('https://')) return name;
  return `${storageBase}/Manifest/${encodeURIComponent(name)}`;
};

/** Converts a bare filename (e.g. "lot123.jpg") to its full public URL in the lotimg bucket */
export const resolveLotImageUrl = (filename: string | null | undefined): string | null => {
  if (!filename || !storageBase) return null;
  const name = filename.trim();
  if (!name) return null;
  if (name.startsWith('http://') || name.startsWith('https://')) return name;
  return `${storageBase}/lotimg/${encodeURIComponent(name)}`;
};

/** Converts a bare filename (e.g. "Logo.png") to its full public URL in the img bucket */
export const resolveImgUrl = (filename: string | null | undefined): string | null => {
  if (!filename || !storageBase) return null;
  const name = filename.trim();
  if (!name) return null;
  if (name.startsWith('http://') || name.startsWith('https://')) return name;
  return `${storageBase}/img/${encodeURIComponent(name)}`;
};
