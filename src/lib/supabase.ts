import { createClient } from '@supabase/supabase-js';

// Resolve Supabase project URL and Anon Key from environment variables (Vite, Next, or fallback)
export const SUPABASE_URL: string =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  (import.meta as any).env?.SUPABASE_URL ||
  'https://yicngusesbhskxcbdpjw.supabase.co';

export const SUPABASE_ANON_KEY: string =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpY25ndXNlc2Joc2t4Y2JkcGp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODQ0MDMsImV4cCI6MjEwNjc2MDQwM30.AsOqjNkeGk-HzGYFY7G9Nl8a6u8RxVrd1nEdc6k0wJE';

// Safe check: Never allow service-role key in frontend code
if (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.includes('service_role')) {
  console.error('CRITICAL SECURITY ERROR: Supabase service-role key must NEVER be used on the client!');
}

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

// Storage bucket name as requested
export const PRODUCT_IMAGES_BUCKET = 'product-images';

// Validation Rules
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit (10,485,760 bytes)

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates product image file:
 * - Allowed types: JPG, JPEG, PNG, WEBP
 * - Max size: 10 MB
 */
export function validateProductImage(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No image file was provided.' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const isMimeValid = ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase());
  const isExtValid = ALLOWED_EXTENSIONS.includes(ext);

  if (!isMimeValid && !isExtValid) {
    return {
      valid: false,
      error: `Invalid file format for "${file.name}". Supported formats are JPG, JPEG, PNG, and WEBP.`
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Image exceeds the maximum upload size of 10 MB. "${file.name}" is ${sizeInMB} MB.`
    };
  }

  return { valid: true };
}

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

export interface UploadProductImageResult {
  publicUrl: string;
  storagePath: string;
  fileName: string;
}

/**
 * Direct upload helper using a pre-signed Supabase Storage upload URL.
 * Completely bypasses Supabase RLS ("new row violates row-level security policy")
 * because the signed URL is authenticated via the server's service-role key.
 */
function uploadToSignedUrlDirect(
  file: File,
  signedUrl: string,
  token: string,
  publicUrl: string,
  storagePath: string,
  onProgress?: UploadProgressCallback
): Promise<UploadProductImageResult> {
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', signedUrl, true);
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.min(98, Math.round((event.loaded / event.total) * 90) + 10);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100);
          resolve({
            publicUrl,
            storagePath,
            fileName: file.name
          });
        } else {
          // If XHR status is non-2xx, attempt fallback with Supabase JS uploadToSignedUrl
          supabase.storage
            .from(PRODUCT_IMAGES_BUCKET)
            .uploadToSignedUrl(storagePath, token, file)
            .then(({ data, error }) => {
              if (error) {
                reject(new Error(error.message || `Upload failed with status ${xhr.status}`));
              } else if (data) {
                if (onProgress) onProgress(100);
                resolve({ publicUrl, storagePath, fileName: file.name });
              }
            })
            .catch(() => {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            });
        }
      };

      xhr.onerror = () => {
        // Fallback to Supabase JS uploadToSignedUrl
        supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .uploadToSignedUrl(storagePath, token, file)
          .then(({ data, error }) => {
            if (error) {
              reject(new Error(error.message || 'Direct upload to signed URL failed.'));
            } else if (data) {
              if (onProgress) onProgress(100);
              resolve({ publicUrl, storagePath, fileName: file.name });
            }
          })
          .catch(err => {
            reject(new Error(err?.message || 'Network error during upload to Supabase Storage.'));
          });
      };

      xhr.send(file);
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Fallback direct upload using anon key and XMLHttpRequest
 */
function uploadViaDirectAnon(
  file: File,
  storagePath: string,
  onProgress?: UploadProgressCallback
): Promise<UploadProductImageResult> {
  return new Promise((resolve, reject) => {
    try {
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${PRODUCT_IMAGES_BUCKET}/${storagePath}`;
      const xhr = new XMLHttpRequest();

      xhr.open('POST', uploadUrl, true);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.setRequestHeader('Content-Type', file.type || 'image/jpeg');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.min(95, Math.round((event.loaded / event.total) * 90) + 10);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100);
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${storagePath}`;
          resolve({
            publicUrl,
            storagePath,
            fileName: file.name
          });
        } else {
          let errorMsg = `Upload failed (Status ${xhr.status})`;
          try {
            const errRes = JSON.parse(xhr.responseText);
            errorMsg = errRes.message || errRes.error || errorMsg;
          } catch {
            if (xhr.status === 404) {
              errorMsg = `Storage bucket '${PRODUCT_IMAGES_BUCKET}' does not exist or Supabase project is not reachable.`;
            } else if (xhr.status === 401 || xhr.status === 403) {
              errorMsg = `Storage access denied. Please verify bucket RLS policies for '${PRODUCT_IMAGES_BUCKET}'.`;
            }
          }
          reject(new Error(errorMsg));
        }
      };

      xhr.onerror = () => {
        supabase.storage
          .from(PRODUCT_IMAGES_BUCKET)
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: true
          })
          .then(({ data, error }) => {
            if (error) {
              reject(
                new Error(
                  `Upload error: ${error.message}.`
                )
              );
            } else if (data) {
              if (onProgress) onProgress(100);
              const { data: pubData } = supabase.storage
                .from(PRODUCT_IMAGES_BUCKET)
                .getPublicUrl(data.path);
              resolve({
                publicUrl: pubData.publicUrl,
                storagePath: data.path,
                fileName: file.name
              });
            }
          })
          .catch((clientErr: any) => {
            reject(
              new Error(
                clientErr.message ||
                  'Network connection error while uploading to Supabase Storage.'
              )
            );
          });
      };

      xhr.send(file);
    } catch (err: any) {
      reject(err);
    }
  });
}

/**
 * Uploads an image directly from the browser to Supabase Storage bucket 'product-images'.
 * 1. Requests a secure signed upload URL from the server (bypassing RLS entirely).
 * 2. Uploads the image file directly from the browser to Supabase Storage with progress tracking.
 * 3. Falls back to direct anon upload if offline or serverless cold start occurs.
 * Emits progress percent (0-100) via onProgress callback.
 * Returns the public image URL and storage path.
 */
export async function uploadProductImageDirect(
  file: File,
  onProgress?: UploadProgressCallback
): Promise<UploadProductImageResult> {
  // 1. Validate file format and size
  const validation = validateProductImage(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid image file');
  }

  if (onProgress) onProgress(5);

  // 2. Request a Signed Upload URL from the server (bypasses Supabase RLS)
  try {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/storage-upload-url', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.signedUrl) {
        return await uploadToSignedUrlDirect(
          file,
          data.signedUrl,
          data.token,
          data.publicUrl,
          data.path,
          onProgress
        );
      }
    }
  } catch (signedErr) {
    console.warn('[Supabase Direct Upload] Signed URL generation failed, attempting anon fallback:', signedErr);
  }

  // 3. Fallback: Collision-free storage path for direct anon upload
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanBaseName = file.name
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 30);
  const uniqueId = Math.random().toString(36).substring(2, 9);
  const storagePath = `products/${Date.now()}_${cleanBaseName}_${uniqueId}.${ext}`;

  return uploadViaDirectAnon(file, storagePath, onProgress);
}

/**
 * Remove an image from Supabase Storage by its public URL or storage path
 */
export async function deleteProductImageFromStorage(imageUri: string): Promise<boolean> {
  try {
    if (!imageUri) return false;
    let path = imageUri;
    if (imageUri.includes(`/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`)) {
      path = imageUri.split(`/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`)[1];
    } else if (imageUri.includes(`${PRODUCT_IMAGES_BUCKET}/`)) {
      path = imageUri.split(`${PRODUCT_IMAGES_BUCKET}/`)[1];
    }

    if (!path || path.startsWith('http')) return false;

    const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
    if (error) {
      console.warn('Supabase storage remove warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error deleting image from Supabase storage:', err);
    return false;
  }
}

/**
 * Saves or updates product image records in the Supabase PostgreSQL product_images table.
 */
export async function saveProductImagesToSupabase(
  productId: string,
  images: Array<{
    image_url: string;
    color?: string;
    is_primary?: boolean;
    display_order?: number;
  }>
) {
  try {
    if (!productId || !Array.isArray(images) || images.length === 0) return;

    const rows = images.map((img, idx) => ({
      product_id: productId,
      image_url: img.image_url,
      color: img.color || '',
      is_primary: idx === 0 || !!img.is_primary,
      display_order: img.display_order !== undefined ? img.display_order : idx
    }));

    const { error } = await supabase
      .from('product_images')
      .upsert(rows, { onConflict: 'product_id,image_url' });

    if (error) {
      console.warn('Supabase product_images table upsert notice:', error.message);
    }
  } catch (err: any) {
    console.warn('Supabase product_images table write warning:', err?.message);
  }
}
