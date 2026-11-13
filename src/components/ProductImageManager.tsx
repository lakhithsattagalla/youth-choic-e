import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  Check,
  AlertCircle,
  Star,
  Loader2,
  Trash2,
  Plus,
  Link as LinkIcon
} from 'lucide-react';
import {
  uploadProductImageDirect,
  validateProductImage,
  deleteProductImageFromStorage,
  PRODUCT_IMAGES_BUCKET
} from '../lib/supabase';

export interface ProductImageItem {
  id: string;
  url: string;
  color?: string;
  is_primary: boolean;
  display_order?: number;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string;
}

interface ProductImageManagerProps {
  images: ProductImageItem[];
  onChange: (images: ProductImageItem[]) => void;
  availableColors?: string[];
}

export const ProductImageManager: React.FC<ProductImageManagerProps> = ({
  images,
  onChange,
  availableColors = []
}) => {
  const [manualUrl, setManualUrl] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colorsList = availableColors
    .map(c => c.trim())
    .filter(Boolean);

  const handleFiles = async (fileList: FileList | File[]) => {
    setUploadError(null);
    const files = Array.from(fileList);
    if (files.length === 0) return;

    for (const file of files) {
      // 1. Validate image format (JPG, JPEG, PNG, WEBP) and max size 5 MB
      const validation = validateProductImage(file);
      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid image file');
        continue;
      }

      // 2. Create placeholder item with progress
      const tempId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const isFirst = images.length === 0;

      const placeholder: ProductImageItem = {
        id: tempId,
        url: '',
        color: '',
        is_primary: isFirst,
        isUploading: true,
        uploadProgress: 5
      };

      // Append to list
      const updatedList = [...images, placeholder];
      onChange(updatedList);

      // 3. Perform direct browser upload to Supabase Storage bucket 'product-images'
      try {
        const result = await uploadProductImageDirect(file, (percent) => {
          onChange(
            updatedList.map(item =>
              item.id === tempId ? { ...item, uploadProgress: percent } : item
            )
          );
        });

        // 4. On success, store the public URL
        onChange(
          updatedList.map(item =>
            item.id === tempId
              ? {
                  ...item,
                  url: result.publicUrl,
                  isUploading: false,
                  uploadProgress: 100
                }
              : item
          )
        );
      } catch (err: any) {
        const errorMsg =
          err?.message ||
          `Failed to upload ${file.name}. Ensure the '${PRODUCT_IMAGES_BUCKET}' bucket exists in Supabase.`;
        setUploadError(errorMsg);

        // Remove failed placeholder or mark error
        onChange(
          updatedList.map(item =>
            item.id === tempId
              ? { ...item, isUploading: false, error: errorMsg }
              : item
          )
        );
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleAddManualUrl = () => {
    if (!manualUrl.trim()) return;
    const url = manualUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setUploadError('Please enter a valid HTTP or HTTPS image URL.');
      return;
    }
    setUploadError(null);
    const isFirst = images.length === 0;
    const newItem: ProductImageItem = {
      id: `url-${Date.now()}`,
      url,
      color: '',
      is_primary: isFirst
    };
    onChange([...images, newItem]);
    setManualUrl('');
    setShowUrlInput(false);
  };

  const setPrimary = (id: string) => {
    onChange(
      images.map(img => ({
        ...img,
        is_primary: img.id === id
      }))
    );
  };

  const removeImage = async (id: string) => {
    const target = images.find(img => img.id === id);
    if (target?.url) {
      // Async clean-up from storage
      deleteProductImageFromStorage(target.url).catch(() => {});
    }
    const filtered = images.filter(img => img.id !== id);
    if (filtered.length > 0 && !filtered.some(img => img.is_primary)) {
      filtered[0].is_primary = true;
    }
    onChange(filtered);
  };

  const updateImageColor = (id: string, color: string) => {
    onChange(
      images.map(img => (img.id === id ? { ...img, color } : img))
    );
  };

  return (
    <div className="space-y-3 p-4 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-inner">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-amber-400 font-extrabold uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <span>Product Images Gallery (Supabase Storage)</span>
          </label>
          <p className="text-[10px] text-slate-400 mt-0.5">
            JPG, JPEG, PNG, WEBP up to 5 MB per image. Uploads directly to Supabase Storage.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1"
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>{showUrlInput ? '📁 Upload File' : '🔗 Add URL'}</span>
        </button>
      </div>

      {/* Error Alert */}
      {uploadError && (
        <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl flex items-start space-x-2.5 text-xs text-red-200 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Image Upload Error</p>
            <p className="text-[11px] text-red-300 mt-0.5">{uploadError}</p>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-red-400 hover:text-red-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Manual URL Input Bar */}
      {showUrlInput && (
        <div className="flex items-center space-x-2 bg-neutral-900 p-2 rounded-xl border border-neutral-800">
          <input
            type="url"
            value={manualUrl}
            onChange={e => setManualUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddManualUrl();
              }
            }}
            placeholder="Paste public image URL (https://...) and press Add"
            className="flex-1 bg-transparent text-white text-xs px-2 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddManualUrl}
            className="bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg shrink-0"
          >
            + Add URL
          </button>
        </div>
      )}

      {/* Drag & Drop Upload Dropzone */}
      <div
        onDragOver={e => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group ${
          isDragging
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-neutral-800 hover:border-amber-500/60 bg-neutral-900/50 hover:bg-neutral-900'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="w-10 h-10 rounded-full bg-neutral-800 group-hover:bg-amber-500/20 text-amber-400 flex items-center justify-center transition-colors">
          <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </div>
        <div>
          <p className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
            Click to upload or drag & drop multiple product images
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Direct browser upload to Supabase Storage (<span className="text-amber-400 font-mono">product-images</span> bucket). Max 5 MB each.
          </p>
        </div>
      </div>

      {/* Image Gallery Grid */}
      {images.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Attached Images: <strong className="text-white">{images.filter(i => !i.isUploading).length}</strong>
            </span>
            <span className="text-[10px] text-slate-500">
              Click ★ to set primary cover photo
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map(img => (
              <div
                key={img.id}
                className={`relative bg-neutral-900 rounded-xl overflow-hidden border transition-all flex flex-col ${
                  img.is_primary
                    ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-lg'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Image Container */}
                <div className="relative aspect-[3/4] w-full bg-black/40 flex items-center justify-center overflow-hidden">
                  {img.isUploading ? (
                    <div className="flex flex-col items-center justify-center p-3 text-center space-y-2">
                      <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                      <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-amber-400 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${img.uploadProgress || 10}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-amber-300">
                        {img.uploadProgress || 10}%
                      </span>
                    </div>
                  ) : img.error ? (
                    <div className="p-2 text-center text-red-400 space-y-1">
                      <AlertCircle className="w-6 h-6 mx-auto" />
                      <p className="text-[9px] line-clamp-2">{img.error}</p>
                    </div>
                  ) : (
                    <img
                      src={img.url}
                      alt="Product"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Primary Badge */}
                  {img.is_primary && !img.isUploading && (
                    <span className="absolute top-1.5 left-1.5 bg-amber-500 text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow flex items-center space-x-0.5">
                      <Star className="w-2.5 h-2.5 fill-black" />
                      <span>PRIMARY</span>
                    </span>
                  )}

                  {/* Top Right Controls */}
                  {!img.isUploading && (
                    <div className="absolute top-1.5 right-1.5 flex items-center space-x-1">
                      {!img.is_primary && (
                        <button
                          type="button"
                          onClick={() => setPrimary(img.id)}
                          title="Set as Primary Cover Photo"
                          className="p-1 bg-black/60 hover:bg-amber-500 hover:text-black text-slate-300 rounded-md transition-colors"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        title="Remove Image"
                        className="p-1 bg-black/60 hover:bg-red-600 text-slate-300 hover:text-white rounded-md transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Color Selector */}
                {colorsList.length > 0 && !img.isUploading && (
                  <div className="p-1.5 bg-neutral-950 border-t border-neutral-800">
                    <select
                      value={img.color || ''}
                      onChange={e => updateImageColor(img.id, e.target.value)}
                      className="w-full bg-neutral-900 text-[10px] text-slate-300 rounded p-1 border border-neutral-800 focus:outline-none focus:border-amber-400"
                    >
                      <option value="">No Color Tag</option>
                      {colorsList.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
