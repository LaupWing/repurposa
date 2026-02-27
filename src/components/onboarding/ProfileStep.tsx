import { useState, useRef } from '@wordpress/element';
import { Spinner } from '@wordpress/components';
import Avatar from 'boring-avatars';
import { Pencil } from 'lucide-react';
import { uploadAvatar } from '@/services/profileApi';
import { stagger } from './stagger';

interface ProfileStepProps {
    leaving: boolean;
    name: string;
    setName: (name: string) => void;
    email: string;
    avatarUrl: string | null;
    onAvatarChange: (url: string) => void;
    onSave: (data: Record<string, unknown>) => void;
    onNext: () => void;
}

export default function ProfileStep({ leaving, name, setName, email, avatarUrl, onAvatarChange, onSave, onNext }: ProfileStepProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (file: File) => {
        setUploading(true);
        try {
            const url = await uploadAvatar(file);
            onAvatarChange(url + '?t=' + Date.now());
        } catch {
            // avatar is optional — fail silently
        } finally {
            setUploading(false);
        }
    };

    const handleContinue = () => {
        onSave({ name });
        onNext();
    };

    return (
        <div className="flex flex-col items-center gap-6 w-full">
            <div {...stagger(0, leaving)} className="space-y-2 text-center">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">Set up your profile</h2>
                <p className="text-sm text-gray-500">How you'll appear on Repurposa</p>
            </div>

            <div className="w-full max-w-sm space-y-4">
                {/* Avatar */}
                <div {...stagger(1, leaving)} className="flex flex-col items-center gap-2">
                    <button
                        type="button"
                        className="group relative rounded-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt="Avatar"
                                className="h-20 w-20 rounded-full object-cover"
                            />
                        ) : (
                            <Avatar
                                size={80}
                                name={email || 'user'}
                                variant="beam"
                                colors={['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#60a5fa']}
                            />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/40">
                            <Pencil size={16} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        {uploading && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                                <Spinner />
                            </div>
                        )}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleAvatarUpload(file);
                            e.target.value = '';
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none cursor-pointer p-0"
                    >
                        Upload photo
                    </button>
                </div>

                {/* Name */}
                <div {...stagger(2, leaving)} className="space-y-2">
                    <label htmlFor="profile-name" className="block text-sm font-medium text-gray-500">Name</label>
                    <input
                        id="profile-name"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && name.trim()) {
                                e.preventDefault();
                                handleContinue();
                            }
                        }}
                        placeholder="Your name"
                        className="w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <button
                    {...stagger(3, leaving)}
                    onClick={handleContinue}
                    disabled={!name.trim()}
                    className="w-full h-10 bg-blue-600 text-white text-sm font-semibold rounded-lg cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
