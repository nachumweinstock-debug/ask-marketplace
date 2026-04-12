/**
 * Server-side image storage helper.
 * Uses the Supabase service-role key (bypasses RLS, auto-creates bucket).
 * Falls back to storing the raw base64 data URL if Supabase Storage is unavailable.
 */
import { supabaseAdmin } from './auth.js';

let bucketReady = false;

async function ensureBucket() {
  if (bucketReady || !supabaseAdmin) return;
  await supabaseAdmin.storage
    .createBucket('media', { public: true, fileSizeLimit: 5242880 })
    .catch(() => {}); // ignore "already exists" error
  bucketReady = true;
}

/**
 * Upload a base64 data URL image to Supabase Storage.
 * Returns the public URL if successful, or the original base64 as fallback.
 *
 * @param {string} dataUrl  - data:image/jpeg;base64,....
 * @param {string} folder   - 'avatars' | 'listings'
 * @param {number|string} userId - SQLite user id (used to build a stable path)
 * @returns {Promise<string>} public URL or original dataUrl
 */
export async function storeImage(dataUrl, folder, userId) {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
  if (!supabaseAdmin) return dataUrl; // no Supabase config → keep base64

  try {
    await ensureBucket();
    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return dataUrl;
    const [, ext, b64] = match;
    const buf = Buffer.from(b64, 'base64');
    const path = `${folder}/${userId}_${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from('media')
      .upload(path, buf, { contentType: `image/${ext}`, upsert: true });

    if (error) return dataUrl; // fallback

    const { data: { publicUrl } } = supabaseAdmin.storage.from('media').getPublicUrl(data.path);
    return publicUrl;
  } catch {
    return dataUrl; // never crash — always return something usable
  }
}
