/**
 * Image Picker Modal
 *
 * Custom modal for selecting images from WordPress media library.
 * Styled to match the rest of the plugin.
 */

import { useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { X, Search, Check, Loader2, Image as ImageIcon } from 'lucide-react';

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

export default function ImagePickerModal({
    isOpen,
    onClose,
    onSelect,
    currentImage,
}: ImagePickerModalProps) {
    const [images, setImages] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(currentImage || null);

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
                            Select from your media library
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-3 border-b border-gray-100">
                    <div className="relative">
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
                <div className="flex-1 overflow-y-auto p-6">
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
                                    onClick={() => setSelectedImage(image.source_url)}
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
