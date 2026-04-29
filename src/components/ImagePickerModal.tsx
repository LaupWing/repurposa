/**
 * Image Picker Modal
 *
 * Custom modal for selecting images from WordPress media library
 * or generating new images with AI.
 */

import { useState, useEffect, useRef, useCallback } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { X, Search, Check, Loader2, Image as ImageIcon, Sparkles, Wand2, MoveHorizontal, Sun, Palette, PenTool, Eraser, Focus, Maximize2, Minimize2, Upload, Play } from 'lucide-react';
import { apiRequest } from '@/services/client';

interface MediaItem {
    id: number;
    source_url: string;
    alt_text: string;
    media_type: string;
    mime_type?: string;
    media_details: {
        width: number;
        height: number;
        sizes?: {
            thumbnail?: { source_url: string };
            medium?: { source_url: string };
        };
    };
    title: {
        rendered: string;
    };
}

interface ImagePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string, type: 'image' | 'video', mime?: string) => void;
    currentImage?: string;
}

type TabType = 'library' | 'generate';

export default function ImagePickerModal({
    isOpen,
    onClose,
    onSelect,
    currentImage,
}: ImagePickerModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('library');
    const [images, setImages] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(currentImage || null);
    const [selectedMediaType, setSelectedMediaType] = useState<'image' | 'video'>('image');
    const [selectedMime, setSelectedMime] = useState<string | undefined>(undefined);

    // AI Generate state
    const [generatePrompt, setGeneratePrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [generatedImageData, setGeneratedImageData] = useState<{ base64: string; mimeType: string } | null>(null);
    const [referenceImages, setReferenceImages] = useState<{ url: string; base64: string; mimeType: string }[]>([]);
    const refImageInputRef = useRef<HTMLInputElement>(null);

    // Upload state
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Modify with AI state
    const [showModifyInput, setShowModifyInput] = useState(false);
    const [modifyPrompt, setModifyPrompt] = useState('');
    const [isModifying, setIsModifying] = useState(false);
    const [modifiedPreview, setModifiedPreview] = useState<{ base64: string; mimeType: string } | null>(null);
    const [isModifyExpanded, setIsModifyExpanded] = useState(false);
    const [showPromptHelper, setShowPromptHelper] = useState(false);
    const [promptHelperText, setPromptHelperText] = useState('');

    // Fetch images from WordPress media library
    useEffect(() => {
        if (!isOpen) return;

        const fetchImages = async () => {
            setIsLoading(true);
            try {
                const response = await apiFetch<MediaItem[]>({
                    path: '/wp/v2/media?per_page=100&orderby=date&order=desc',
                });
                setImages(response.filter(m => m.media_type === 'image' || m.media_type === 'video'));
            } catch (error) {
                console.error('Failed to fetch images:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchImages();
    }, [isOpen]);

    // Upload file to WordPress media library
    const handleUploadFiles = useCallback(async (files: FileList | File[]) => {
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
        if (imageFiles.length === 0) return;

        setIsUploading(true);
        try {
            for (const file of imageFiles) {
                const formData = new FormData();
                formData.append('file', file);

                const uploaded = await apiFetch<MediaItem>({
                    path: '/wp/v2/media',
                    method: 'POST',
                    body: formData,
                });

                setImages(prev => [uploaded, ...prev]);
                setSelectedImage(uploaded.source_url);
                setSelectedMediaType(uploaded.media_type === 'video' ? 'video' : 'image');
                setSelectedMime(uploaded.mime_type);
            }
        } catch (error) {
            console.error('Failed to upload image:', error);
        } finally {
            setIsUploading(false);
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            handleUploadFiles(e.dataTransfer.files);
        }
    }, [handleUploadFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setShowModifyInput(false);
            setModifyPrompt('');
            setIsModifyExpanded(false);
            setModifiedPreview(null);
            setGeneratePrompt('');
            setReferenceImages([]);
            setGeneratedImageData(null);
            setGeneratedImage(null);
            setShowPromptHelper(false);
            setPromptHelperText('');
        }
    }, [isOpen]);

    // Filter images by search
    const filteredImages = images.filter((image) =>
        searchQuery === '' ||
        image.title.rendered.toLowerCase().includes(searchQuery.toLowerCase()) ||
        image.alt_text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddReferenceImages = useCallback(async (files: FileList | File[]) => {
        const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        const newRefs: { url: string; base64: string; mimeType: string }[] = [];
        for (const file of imageFiles) {
            const url = URL.createObjectURL(file);
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    resolve(result.split(',')[1]);
                };
                reader.readAsDataURL(file);
            });
            newRefs.push({ url, base64, mimeType: file.type });
        }
        setReferenceImages(prev => [...prev, ...newRefs].slice(0, 5));
    }, []);

    const [isSaving, setIsSaving] = useState(false);

    const handleSelect = async () => {
        if (!selectedImage) return;

        // If it's a generated image (data URL), upload to WP first
        if (generatedImageData && selectedImage.startsWith('data:')) {
            setIsSaving(true);
            try {
                const imageBytes = atob(generatedImageData.base64);
                const byteArray = new Uint8Array(imageBytes.length);
                for (let i = 0; i < imageBytes.length; i++) {
                    byteArray[i] = imageBytes.charCodeAt(i);
                }
                const ext = generatedImageData.mimeType.split('/')[1] || 'png';
                const file = new File([byteArray], `ai-generated-${Date.now()}.${ext}`, { type: generatedImageData.mimeType });

                const formData = new FormData();
                formData.append('file', file);

                const uploaded = await apiFetch<MediaItem>({
                    path: '/wp/v2/media',
                    method: 'POST',
                    body: formData,
                });

                onSelect(uploaded.source_url, 'image', uploaded.mime_type);
                onClose();
            } catch (error) {
                console.error('Failed to save generated image:', error);
            } finally {
                setIsSaving(false);
            }
            return;
        }

        onSelect(selectedImage, selectedMediaType, selectedMime);
        onClose();
    };

    const handleGenerate = async () => {
        if (!generatePrompt.trim()) return;

        setIsGenerating(true);
        try {
            const images = referenceImages.map(ref => ({
                data: ref.base64,
                mime_type: ref.mimeType,
            }));

            const result = await apiRequest<{
                image: string;
                mime_type: string;
                text: string | null;
            }>('/image/generate', {
                prompt: generatePrompt,
                images,
                aspect_ratio: '16:9',
            });

            const dataUrl = `data:${result.mime_type};base64,${result.image}`;
            setGeneratedImage(dataUrl);
            setSelectedImage(dataUrl);

            // Store base64 for saving later
            setGeneratedImageData({ base64: result.image, mimeType: result.mime_type });
        } catch (error) {
            console.error('Failed to generate image:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleModify = async () => {
        if (!modifyPrompt.trim() || !selectedImage) return;

        setIsModifying(true);
        try {
            // Fetch the selected image and convert to base64
            const imgResponse = await fetch(selectedImage);
            const blob = await imgResponse.blob();
            const mimeType = blob.type || 'image/png';
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    resolve(result.split(',')[1]);
                };
                reader.readAsDataURL(blob);
            });

            // Call the Laravel image editing API
            const result = await apiRequest<{
                image: string;
                mime_type: string;
                text: string | null;
            }>('/image/generate', {
                prompt: modifyPrompt,
                image: base64,
                image_mime_type: mimeType,
                aspect_ratio: '16:9',
            });

            // Show preview instead of saving directly
            setModifiedPreview({ base64: result.image, mimeType: result.mime_type });
        } catch (error) {
            console.error('Failed to modify image:', error);
        } finally {
            setIsModifying(false);
        }
    };

    const handleAcceptModified = async () => {
        if (!modifiedPreview) return;

        setIsModifying(true);
        try {
            const imageBytes = atob(modifiedPreview.base64);
            const byteArray = new Uint8Array(imageBytes.length);
            for (let i = 0; i < imageBytes.length; i++) {
                byteArray[i] = imageBytes.charCodeAt(i);
            }
            const ext = modifiedPreview.mimeType.split('/')[1] || 'png';
            const file = new File([byteArray], `ai-modified-${Date.now()}.${ext}`, { type: modifiedPreview.mimeType });

            const formData = new FormData();
            formData.append('file', file);

            const uploaded = await apiFetch<MediaItem>({
                path: '/wp/v2/media',
                method: 'POST',
                body: formData,
            });

            setImages(prev => [uploaded, ...prev]);
            setSelectedImage(uploaded.source_url);
            setShowModifyInput(false);
            setModifyPrompt('');
            setIsModifyExpanded(false);
            setModifiedPreview(null);
        } catch (error) {
            console.error('Failed to save modified image:', error);
        } finally {
            setIsModifying(false);
        }
    };

    const handleDiscardModified = () => {
        setModifiedPreview(null);
    };

    const getThumbnailUrl = (image: MediaItem) => {
        return image.media_details.sizes?.medium?.source_url ||
               image.media_details.sizes?.thumbnail?.source_url ||
               image.source_url;
    };

    // Preset AI modifications with preview images
    const presetModifications = [
        {
            id: 'expand',
            icon: MoveHorizontal,
            label: 'Expand',
            tooltip: 'Make the image wider by extending the sides with AI',
            prompt: 'Expand this image horizontally, extend the background naturally on both sides',
            preview: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop',
        },
        {
            id: 'brighten',
            icon: Sun,
            label: 'Brighten',
            tooltip: 'Increase brightness and make colors more vibrant',
            prompt: 'Make this image brighter and more vibrant, enhance the colors',
            preview: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=100&h=100&fit=crop',
        },
        {
            id: 'anime',
            icon: Sparkles,
            label: 'Anime',
            tooltip: 'Convert to anime art style',
            prompt: 'Convert this image to anime art style, vibrant colors, clean lines, Japanese animation aesthetic',
            preview: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100&h=100&fit=crop',
        },
        {
            id: 'cartoon',
            icon: PenTool,
            label: 'Cartoon',
            tooltip: 'Convert to cartoon style',
            prompt: 'Convert this image to a fun cartoon style, bold outlines, simplified shapes, bright colors',
            preview: 'https://images.unsplash.com/photo-1569017388730-020b5f80a004?w=100&h=100&fit=crop',
        },
        {
            id: 'comic',
            icon: Palette,
            label: 'Comic',
            tooltip: 'Convert to comic book style',
            prompt: 'Convert this image to comic book style, halftone dots, bold ink lines, dramatic shading, pop art aesthetic',
            preview: 'https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=100&h=100&fit=crop',
        },
        {
            id: 'retro-70s',
            icon: Sun,
            label: '70s Retro',
            tooltip: 'Convert to 70s retro cartoon style',
            prompt: 'Convert this image to 1970s retro cartoon style, groovy colors, warm oranges and browns, vintage aesthetic, psychedelic vibes',
            preview: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=100&h=100&fit=crop',
        },
        {
            id: 'pixel-art',
            icon: Sparkles,
            label: 'Pixel Art',
            tooltip: 'Convert to retro pixel art style',
            prompt: 'Convert this image to pixel art style, 16-bit retro gaming aesthetic, limited color palette, crisp pixels',
            preview: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&h=100&fit=crop',
        },
        {
            id: 'remove-bg',
            icon: Eraser,
            label: 'Remove BG',
            tooltip: 'Remove the background from the image',
            prompt: 'Remove the background and make it transparent',
            preview: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        },
        {
            id: 'blur-bg',
            icon: Focus,
            label: 'Blur BG',
            tooltip: 'Blur the background to focus on the subject',
            prompt: 'Blur the background while keeping the main subject sharp and in focus',
            preview: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop',
        },
    ];

    const handlePresetClick = (prompt: string) => {
        setModifyPrompt(prompt);
        setShowModifyInput(true);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col overflow-visible">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h3 className="font-semibold text-lg text-gray-900">
                            Choose Image
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Select from library or generate with AI
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className={`flex gap-1 px-6 py-3 border-b border-gray-100 bg-gray-50 ${isModifyExpanded ? 'hidden' : ''}`}>
                    <button
                        onClick={() => { setActiveTab('library'); setGeneratedImage(null); }}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === 'library'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                        }`}
                    >
                        <ImageIcon size={16} />
                        Library
                    </button>
                    <button
                        onClick={() => { setActiveTab('generate'); setShowModifyInput(false); setIsModifyExpanded(false); }}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeTab === 'generate'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                        }`}
                    >
                        <Sparkles size={16} />
                        Generate with AI
                    </button>
                </div>

                {/* Content */}
                <div className={`flex-1 overflow-y-auto ${isModifyExpanded ? 'hidden' : ''}`}>
                    {activeTab === 'library' ? (
                        <div
                            className="p-6 relative"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                        >
                            {/* Drag overlay */}
                            {isDragging && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-blue-50/90 border-2 border-dashed border-blue-400 rounded-lg m-2">
                                    <div className="text-center">
                                        <Upload size={32} className="text-blue-500 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-blue-700">Drop images here</p>
                                    </div>
                                </div>
                            )}

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                        handleUploadFiles(e.target.files);
                                        e.target.value = '';
                                    }
                                }}
                            />

                            {/* Upload button + Search row */}
                            <div className="flex items-center gap-3 mb-4">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors shrink-0 disabled:opacity-50"
                                >
                                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                    {isUploading ? 'Uploading...' : 'Upload'}
                                </button>
                                <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Search images..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-10 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                </div>
                            </div>

                            {/* Image Grid */}
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 size={32} className="text-blue-500 animate-spin mb-3" />
                                    <p className="text-sm text-gray-500">Loading images...</p>
                                </div>
                            ) : filteredImages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <ImageIcon size={48} className="text-gray-300 mb-3" />
                                    <p className="text-sm text-gray-500">
                                        {searchQuery ? 'No images match your search' : 'No images in media library'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-4 gap-3">
                                        {filteredImages.map((image) => (
                                            <button
                                                key={image.id}
                                                onClick={() => {
                                                    setSelectedImage(image.source_url);
                                                    setSelectedMediaType(image.media_type === 'video' ? 'video' : 'image');
                                                    setSelectedMime(image.mime_type);
                                                    setShowModifyInput(false);
                                                }}
                                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                                    selectedImage === image.source_url
                                                        ? 'border-blue-500 ring-2 ring-blue-500/30'
                                                        : 'border-transparent hover:border-gray-300'
                                                }`}
                                            >
                                                {image.media_type === 'video' ? (
                                                    <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-1 px-1">
                                                        <Play size={20} className="text-white shrink-0" />
                                                        <span className="text-[10px] text-gray-400 text-center truncate w-full">{image.title.rendered}</span>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={getThumbnailUrl(image)}
                                                        alt={image.alt_text || image.title.rendered}
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                                {selectedImage === image.source_url && (
                                                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                                            <Check size={18} className="text-white" />
                                                        </div>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                </>
                            )}

                        </div>
                    ) : (
                        /* Generate Tab */
                        <div className="p-6">
                            <div className="max-w-lg mx-auto">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Sparkles size={28} className="text-blue-600" />
                                    </div>
                                    <h4 className="font-semibold text-gray-900 mb-1">
                                        Generate with AI
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                        Describe the image you want to create
                                    </p>
                                </div>

                                {/* Reference Images */}
                                <div className="mb-4">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Reference images <span className="text-gray-400 font-normal">(optional)</span>
                                    </label>
                                    <div className="flex items-center gap-3">
                                        {referenceImages.map((ref, i) => (
                                            <div key={i} className="relative shrink-0">
                                                <img
                                                    src={ref.url}
                                                    alt={`Reference ${i + 1}`}
                                                    className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                                                />
                                                <div className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                                    {i + 1}
                                                </div>
                                                <button
                                                    onClick={() => setReferenceImages(prev => prev.filter((_, j) => j !== i))}
                                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                        {referenceImages.length < 5 && (
                                            <button
                                                onClick={() => refImageInputRef.current?.click()}
                                                className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                                            >
                                                <ImageIcon size={20} />
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        ref={refImageInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                handleAddReferenceImages(e.target.files);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    {referenceImages.length > 0 && (
                                        <p className="text-xs text-gray-400 mt-1.5">
                                            Reference images by number in your prompt, e.g. "recreate image 1 in the style of image 2"
                                        </p>
                                    )}
                                </div>

                                <textarea
                                    value={generatePrompt}
                                    onChange={(e) => setGeneratePrompt(e.target.value)}
                                    placeholder={referenceImages.length > 0
                                        ? "e.g., Recreate image 1 as a blog header with warm lighting and minimalist style"
                                        : "e.g., A professional blog header image showing a laptop on a wooden desk with a coffee cup, warm lighting, minimalist style"
                                    }
                                    rows={4}
                                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                                />

                                <button
                                    onClick={handleGenerate}
                                    disabled={!generatePrompt.trim() || isGenerating}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={16} />
                                            Generate Image
                                        </>
                                    )}
                                </button>

                                {/* Generated image preview */}
                                {generatedImage && (
                                    <div className="mt-6">
                                        <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                                        <div className="relative rounded-lg overflow-hidden border border-gray-200">
                                            <img
                                                src={generatedImage}
                                                alt="Generated preview"
                                                className="w-full h-48 object-cover"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modify with AI Input - shows above footer when active */}
                {showModifyInput && selectedImage && activeTab === 'library' && selectedMediaType !== 'video' && (
                    <div className={`relative px-6 py-4 border-t border-gray-200 bg-blue-50 overflow-visible ${isModifyExpanded ? 'flex-1 flex flex-col' : ''}`}>

                        {/* Preview of modified image */}
                        {modifiedPreview ? (
                            <div>
                                <p className="text-sm font-medium text-gray-700 mb-3">Modified image preview:</p>
                                <div className="flex gap-4 mb-4">
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-1">Original</p>
                                        <img src={selectedImage} alt="Original" className="w-full h-48 object-cover rounded-lg border border-gray-200" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-500 mb-1">Modified</p>
                                        <img src={`data:${modifiedPreview.mimeType};base64,${modifiedPreview.base64}`} alt="Modified" className="w-full h-48 object-cover rounded-lg border border-blue-300" />
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={handleDiscardModified}
                                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white rounded-lg transition-colors"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        onClick={() => { setModifiedPreview(null); }}
                                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white rounded-lg transition-colors"
                                    >
                                        Try again
                                    </button>
                                    <button
                                        onClick={handleAcceptModified}
                                        disabled={isModifying}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {isModifying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        {isModifying ? 'Saving...' : 'Accept'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                        <>
                        {/* Expand/Collapse button */}
                        <button
                            onClick={() => setIsModifyExpanded(!isModifyExpanded)}
                            className="absolute top-3 right-3 p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-lg transition-colors z-10"
                            title={isModifyExpanded ? 'Collapse' : 'Expand'}
                        >
                            {isModifyExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>

                        <div className="flex items-center gap-2 mb-3">
                            <label className="text-sm font-medium text-gray-700">
                                How would you like to modify this image?
                            </label>
                            <div className="relative group">
                                <button
                                    type="button"
                                    onClick={() => setModifyPrompt(prev => prev + (prev ? ' ' : '') + '{blog_title}')}
                                    className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors font-mono"
                                >
                                    {'{blog_title}'}
                                </button>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100001]">
                                    This will inject the title of your blog when creating or modifying the image
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                                </div>
                            </div>
                        </div>

                        {/* Thumbnail + Textarea row */}
                        <div className={`flex gap-4 mb-4 ${isModifyExpanded ? 'flex-1' : ''}`}>
                            {/* Selected image thumbnail - only in expanded mode */}
                            {isModifyExpanded && (
                                <div className="shrink-0 self-start">
                                    <img
                                        src={selectedImage}
                                        alt="Image to modify"
                                        className="w-40 h-40 rounded-lg object-cover border-2 border-white shadow-md"
                                    />
                                </div>
                            )}

                            {/* Textarea and buttons */}
                            <div className={`flex-1 flex flex-col gap-3 ${isModifyExpanded ? 'h-full' : ''}`}>
                                <div className="relative">
                                    <textarea
                                        value={modifyPrompt}
                                        onChange={(e) => setModifyPrompt(e.target.value)}
                                        placeholder="e.g., Make it brighter, add text overlay, convert to illustration..."
                                        rows={isModifyExpanded ? 10 : 2}
                                        className={`w-full px-4 py-3 pr-10 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${isModifyExpanded ? 'flex-1' : ''}`}
                                        autoFocus
                                    />
                                    {/* AI Prompt Helper Button */}
                                    <div className="absolute bottom-2 right-2 group">
                                        <button
                                            type="button"
                                            onClick={() => setShowPromptHelper(!showPromptHelper)}
                                            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                        >
                                            <Sparkles size={16} />
                                        </button>
                                        {/* Tooltip */}
                                        {!showPromptHelper && (
                                            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100001]">
                                                Modify prompt with AI
                                                <div className="absolute top-full right-3 border-4 border-transparent border-t-gray-900" />
                                            </div>
                                        )}
                                        {/* Popover - above sparkles button */}
                                        {showPromptHelper && (
                                            <>
                                                {/* Click outside overlay */}
                                                <div
                                                    className="fixed inset-0 z-[100000]"
                                                    onClick={() => {
                                                        setShowPromptHelper(false);
                                                        setPromptHelperText('');
                                                    }}
                                                />
                                                <div className="absolute bottom-full right-0 mb-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-[100001]">
                                                    <p className="text-sm font-medium text-gray-700 mb-2">How do you want to modify the prompt?</p>
                                                    <textarea
                                                        value={promptHelperText}
                                                        onChange={(e) => setPromptHelperText(e.target.value)}
                                                        placeholder="e.g., Make it shorter, add more detail, change the tone..."
                                                        rows={3}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                // TODO: Call AI to modify the prompt based on promptHelperText
                                                                setShowPromptHelper(false);
                                                                setPromptHelperText('');
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            // TODO: Call AI to modify the prompt based on promptHelperText
                                                            setShowPromptHelper(false);
                                                            setPromptHelperText('');
                                                        }}
                                                        disabled={!promptHelperText.trim()}
                                                        className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <Sparkles size={14} />
                                                        Modify
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => {
                                            setShowModifyInput(false);
                                            setModifyPrompt('');
                                            setIsModifyExpanded(false);
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleModify}
                                        disabled={!modifyPrompt.trim() || isModifying}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isModifying ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Wand2 size={16} />
                                        )}
                                        {isModifying ? 'Applying...' : 'Apply'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Preset modifications - always horizontal scroll */}
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {presetModifications.map((preset) => (
                                <div key={preset.id} className="relative group shrink-0">
                                    <button
                                        onClick={() => setModifyPrompt(preset.prompt)}
                                        className="w-20 h-20 rounded-lg bg-white border-2 border-gray-200 hover:border-blue-400 transition-colors overflow-hidden relative"
                                    >
                                        {/* Preview image */}
                                        <img
                                            src={preset.preview}
                                            alt={preset.label}
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Overlay with label */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col items-center justify-end p-1.5">
                                            <preset.icon size={14} className="text-white mb-0.5" />
                                            <span className="text-[10px] font-medium text-white">{preset.label}</span>
                                        </div>
                                    </button>
                                    {/* Tooltip - above */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100001]">
                                        {preset.tooltip}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        </>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <div className="flex items-center gap-3">
                        {selectedImage && activeTab === 'library' && !showModifyInput && selectedMediaType !== 'video' && (
                            <button
                                onClick={() => setShowModifyInput(true)}
                                className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                <Wand2 size={16} />
                                Modify with AI
                            </button>
                        )}
                        <button
                            onClick={handleSelect}
                            disabled={!selectedImage || isSaving}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {isSaving ? 'Saving...' : 'Select Image'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
