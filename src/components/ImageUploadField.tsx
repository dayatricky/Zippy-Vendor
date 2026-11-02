'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, X, Link as LinkIcon, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { resolveImageUrl } from '@/utils/imageUrl';

interface ImageUploadFieldProps {
  label?: string;
  required?: boolean;
  value?: string; // Current image URL or server path (e.g. /uploads/products/unique-name.jpg)
  onChangeUrl?: (url: string) => void;
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
  isUploading?: boolean;
  uploadStatusText?: string;
  helperText?: string;
  aspectRatio?: 'square' | 'video' | 'banner';
}

export default function ImageUploadField({
  label = 'Image',
  required = false,
  value = '',
  onChangeUrl,
  selectedFile,
  onSelectFile,
  isUploading = false,
  uploadStatusText = 'Uploading image to backend...',
  helperText = 'Supported formats: JPG, PNG, WEBP (Max: 5MB)',
  aspectRatio = 'square',
}: ImageUploadFieldProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manage preview URL when file changes or value changes
  useEffect(() => {
    if (selectedFile) {
      const objUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objUrl);
      return () => {
        URL.revokeObjectURL(objUrl);
      };
    } else if (value && value.trim()) {
      setPreviewUrl(resolveImageUrl(value));
    } else {
      setPreviewUrl('');
    }
  }, [selectedFile, value]);

  const handleFileChange = (file: File | null) => {
    setErrorMsg('');
    if (!file) {
      onSelectFile(null);
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    // Validate size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorMsg('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    onSelectFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemoveImage = () => {
    onSelectFile(null);
    if (onChangeUrl) {
      onChangeUrl('');
    }
    setPreviewUrl('');
    setErrorMsg('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const aspectClass =
    aspectRatio === 'banner'
      ? 'h-36 w-full'
      : aspectRatio === 'video'
      ? 'h-44 w-full'
      : 'h-40 w-full';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>

        {/* Tab switch between file upload & web URL */}
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2.5 py-0.5 rounded-md font-bold transition-all flex items-center space-x-1 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-[#167a46] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3 h-3" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`px-2.5 py-0.5 rounded-md font-bold transition-all flex items-center space-x-1 cursor-pointer ${
              activeTab === 'url'
                ? 'bg-white text-[#167a46] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LinkIcon className="w-3 h-3" />
            <span>Image URL</span>
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
          }
        }}
      />

      {/* Active Tab: Upload from Device */}
      {activeTab === 'upload' && (
        <div>
          {previewUrl ? (
            <div className={`relative ${aspectClass} rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-slate-50 group shadow-inner flex items-center justify-center`}>
              <img
                src={previewUrl}
                alt="Selected preview"
                className="w-full h-full object-cover"
                onError={(e: any) => {
                  e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80';
                }}
              />

              {/* Uploading Overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white space-y-2 z-10">
                  <Loader2 className="w-7 h-7 animate-spin text-emerald-400" />
                  <p className="text-xs font-bold">{uploadStatusText}</p>
                </div>
              )}

              {/* Top Badges */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                {selectedFile ? (
                  <span className="bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs border border-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Ready for backend upload</span>
                  </span>
                ) : value && value.includes('/uploads/') ? (
                  <span className="bg-slate-900/80 backdrop-blur-md text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-lg shadow-xs border border-slate-700">
                    Local: {value}
                  </span>
                ) : null}
              </div>

              {/* Action buttons on hover */}
              {!isUploading && (
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/90 hover:bg-white text-slate-700 hover:text-[#167a46] p-1.5 rounded-xl shadow-md border border-slate-200 text-xs font-bold flex items-center space-x-1 transition-all cursor-pointer"
                    title="Change image"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="text-[10px] hidden sm:inline">Change</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-xl shadow-md border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* File Info Bar at bottom */}
              {selectedFile && (
                <div className="absolute bottom-0 inset-x-0 bg-slate-900/75 backdrop-blur-xs px-3 py-1.5 text-white flex items-center justify-between text-[11px]">
                  <span className="truncate max-w-[200px] font-medium">{selectedFile.name}</span>
                  <span className="text-slate-300 font-mono text-[10px] shrink-0">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#167a46] bg-emerald-50/50 scale-[1.01]'
                  : 'border-slate-300 hover:border-[#167a46] hover:bg-slate-50'
              }`}
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-[#167a46] flex items-center justify-center mb-2.5 border border-emerald-200 shadow-xs">
                <Upload className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                Click to browse or drag & drop photo here
              </p>
              <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
            </div>
          )}
        </div>
      )}

      {/* Active Tab: Web Image URL */}
      {activeTab === 'url' && (
        <div className="space-y-2">
          <input
            type="url"
            placeholder="https://images.unsplash.com/... or /uploads/products/..."
            value={value}
            onChange={(e) => {
              if (onChangeUrl) onChangeUrl(e.target.value);
              onSelectFile(null);
            }}
            className="custom-input w-full px-4 py-2 text-sm"
          />

          {value && (
            <div className={`relative ${aspectClass} rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center`}>
              <img
                src={resolveImageUrl(value)}
                alt="URL Preview"
                className="w-full h-full object-cover"
                onError={(e: any) => {
                  e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80';
                }}
              />
              <div className="absolute top-2 right-2">
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="bg-white/90 text-rose-600 p-1 rounded-lg border border-slate-200 shadow-xs cursor-pointer hover:bg-rose-50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation / Error Message */}
      {errorMsg && (
        <div className="flex items-center space-x-1.5 text-xs text-rose-600 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 animate-in fade-in-50">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
