/**
 * Image Picker Modal
 *
 * Custom modal for selecting images from WordPress media library
 * or generating new images with AI.
 */

import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { X, Search, Check, Loader2, Image as ImageIcon, Sparkles, Wand2 } from 'lucide-react';

interface MediaItem {
    id: number;
    source_url: string;
    alt_text: string;
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
    onSelect: (imageUrl: string) => void;
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

    // AI Generate state
    const [generatePrompt, setGeneratePrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Modify with AI state
    const [showModifyInput, setShowModifyInput] = useState(false);
    const [modifyPrompt, setModifyPrompt] = useState('');
    const [isModifying, setIsModifying] = useState(false);

    // Fetch images from WordPress media library
    useEffect(() => {
        if (!isOpen) return;

        const fetchImages = async () => {
            setIsLoading(true);
            try {
                const response = await apiFetch<MediaItem[]>({
                    path: '/wp/v2/media?media_type=image&per_page=50&orderby=date&order=desc',
                });
                setImages(response);
            } catch (error) {
                console.error('Failed to fetch images:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchImages();
    }, [isOpen]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setShowModifyInput(false);
            setModifyPrompt('');
            setGeneratePrompt('');
        }
    }, [isOpen]);

    // Filter images by search
    const filteredImages = images.filter((image) =>
        searchQuery === '' ||
        image.title.rendered.toLowerCase().includes(searchQuery.toLowerCase()) ||
        image.alt_text.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = () => {
        if (selectedImage) {
            onSelect(selectedImage);
            onClose();
        }
    };

    const handleGenerate = async () => {
        if (!generatePrompt.trim()) return;

        setIsGenerating(true);
        // TODO: Connect to AI image generation API
        // For now, simulate with a delay and placeholder
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Placeholder - replace with actual AI generation
        const placeholderUrl = `https://picsum.photos/seed/${Date.now()}/1200/630`;
        setSelectedImage(placeholderUrl);
        setIsGenerating(false);
    };

    const handleModify = async () => {
        if (!modifyPrompt.trim() || !selectedImage) return;

        setIsModifying(true);
        // TODO: Connect to AI image modification API
        // For now, simulate with a delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Placeholder - in real implementation, this would return modified image
        // For now just keep the same image
        setIsModifying(false);
        setShowModifyInput(false);
        setModifyPrompt('');
    };

    const getThumbnailUrl = (image: MediaItem) => {
        return image.media_details.sizes?.medium?.source_url ||
               image.media_details.sizes?.thumbnail?.source_url ||
               image.source_url;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col overflow-hidden">
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
                <div className="flex gap-1 px-6 py-3 border-b border-gray-100 bg-gray-50">
                    <button
                        onClick={() => setActiveTab('library')}
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
                        onClick={() => setActiveTab('generate')}
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
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'library' ? (
                        <div className="p-6">
                            {/* Search */}
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    placeholder="Search images..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-10 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                                <div className="grid grid-cols-4 gap-3">
                                    {filteredImages.map((image) => (
                                        <button
                                            key={image.id}
                                            onClick={() => {
                                                setSelectedImage(image.source_url);
                                                setShowModifyInput(false);
                                            }}
                                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                                selectedImage === image.source_url
                                                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                                                    : 'border-transparent hover:border-gray-300'
                                            }`}
                                        >
                                            <img
                                                src={getThumbnailUrl(image)}
                                                alt={image.alt_text || image.title.rendered}
                                                className="w-full h-full object-cover"
                                            />
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
                            )}

                            {/* Modify with AI section - shows when image is selected */}
                            {selectedImage && activeTab === 'library' && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    {showModifyInput ? (
                                        <div className="space-y-3">
                                            <label className="text-sm font-medium text-gray-700">
                                                How would you like to modify this image?
                                            </label>
                                            <textarea
                                                value={modifyPrompt}
                                                onChange={(e) => setModifyPrompt(e.target.value)}
                                                placeholder="e.g., Make it brighter, add a blue overlay, convert to illustration style..."
                                                rows={2}
                                                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleModify}
                                                    disabled={!modifyPrompt.trim() || isModifying}
                                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {isModifying ? (
                                                        <>
                                                            <Loader2 size={16} className="animate-spin" />
                                                            Modifying...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Wand2 size={16} />
                                                            Apply Changes
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowModifyInput(false);
                                                        setModifyPrompt('');
                                                    }}
                                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowModifyInput(true)}
                                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            <Wand2 size={16} />
                                            Modify with AI
                                        </button>
                                    )}
                                </div>
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

                                <textarea
                                    value={generatePrompt}
                                    onChange={(e) => setGeneratePrompt(e.target.value)}
                                    placeholder="e.g., A professional blog header image showing a laptop on a wooden desk with a coffee cup, warm lighting, minimalist style"
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
                                {selectedImage && activeTab === 'generate' && (
                                    <div className="mt-6">
                                        <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                                        <div className="relative rounded-lg overflow-hidden border border-gray-200">
                                            <img
                                                src={selectedImage}
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

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSelect}
                        disabled={!selectedImage}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                        Select Image
                    </button>
                </div>
            </div>
        </div>
    );
}
