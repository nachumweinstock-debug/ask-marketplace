import { supabase } from './supabase';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '');

export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}

/**
 * Resize an image File/Blob, upload it to Supabase Storage, and return the public URL.
 * @param {File} file - the original file
 * @param {'avatars'|'listings'} folder - subfolder in the "media" bucket
 * @param {number} maxDim - largest dimension after resize (px)
 */
export async function uploadToStorage(file, folder, maxDim) {
  // Resize client-side before uploading
  const blob = await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => { URL.revokeObjectURL(url); resolve(b); }, 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });

  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id || 'anon';
  const path = `${folder}/${uid}_${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from('media')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

  if (error) throw new Error(error.message);

  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(data.path);
  return publicUrl;
}
