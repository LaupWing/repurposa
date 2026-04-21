/**
 * Settings Page
 *
 * Profile settings + social media connections.
 * Centered layout matching BlogWizard design.
 */

import { useState, useRef } from "@wordpress/element";
import { toast } from "sonner";
import Avatar from "boring-avatars";
import { AlertTriangle, Check, ExternalLink, Save, Loader2, Pencil, Zap } from "lucide-react";
import { getConfig } from "@/services/client";
import { TimezonePicker } from "@/components/TimezonePicker";
import { useProfileStore } from "@/store/profileStore";
import type { ProfileData } from "@/store/profileStore";
import { disconnectSocialAccount, uploadAvatar, updateUser } from "@/services/profileApi";
import { useSocialPopup } from "@/hooks/useSocialPopup";
import { CONNECT_PLATFORMS } from "@/constants/platforms";

const BRAND_VOICES = ["conversational", "professional", "bold"] as const;

// ============================================
// COMPONENT
// ============================================

export default function SettingsPage() {
  const { user, profile: contextProfile, socialConnections, isLoading, saveProfile, refreshProfile } = useProfileStore();
  const [localProfile, setLocalProfile] = useState<ProfileData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<string | null>(null);
  const [userName, setUserName] = useState(user?.name ?? '');
  const [userEmail, setUserEmail] = useState(user?.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar ?? null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarSelect = (file: File) => {
    setPendingAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const displayAvatar = avatarPreview || avatarUrl;
  const hasUserChanges =
    userName !== (user?.name ?? '') ||
    userEmail !== (user?.email ?? '') ||
    pendingAvatarFile !== null;

  const handleSaveUser = async () => {
    setSavingUser(true);
    try {
      // Upload avatar first if changed
      if (pendingAvatarFile) {
        const url = await uploadAvatar(pendingAvatarFile);
        setAvatarUrl(url + '?t=' + Date.now());
        setPendingAvatarFile(null);
        if (avatarPreview) {
          URL.revokeObjectURL(avatarPreview);
          setAvatarPreview(null);
        }
      }

      // Save name/email
      await updateUser({ name: userName, email: userEmail });
      await refreshProfile();
      toast.success('Account updated!');
    } catch {
      toast.error('Failed to save account');
    } finally {
      setSavingUser(false);
    }
  };

  // Sync context profile to local state for editing
  if (contextProfile && !initialized) {
    setLocalProfile(contextProfile);
    setInitialized(true);
  }

  const profile = localProfile;
  const setProfile = setLocalProfile;

  // Merge social connections into platforms
  const mergedPlatforms = CONNECT_PLATFORMS.map((platform) => {
    const connection = socialConnections.find((c) => c.platform === platform.id);
    if (connection) {
      return { ...platform, connected: true as const, username: connection.username, profilePicture: connection.profilePicture, meta: connection.meta };
    }
    return { ...platform, connected: false as const, username: undefined, profilePicture: undefined, meta: undefined };
  });

  const handleSaveProfile = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      await saveProfile(profile);
      toast.success("Profile saved!");
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const { connectingPlatform, openPopup } = useSocialPopup({
    messageType: 'social-connected',
    onSuccess: async (platformId, eventData) => {
      try {
        await refreshProfile();
        toast.success(`Connected to ${eventData.platform || platformId}!`);
      } catch (error) {
        console.error('Failed to refresh profile after connect:', error);
        toast.error('Connected but failed to refresh. Please reload the page.');
      }
    },
  });

  const handleConnect = (platformId: string) => {
    const { apiUrl } = window.repurposaConfig || { apiUrl: 'http://127.0.0.1:8000' };
    const origin = window.location.origin;
    openPopup(`${apiUrl}/social/${platformId}/connect?origin=${encodeURIComponent(origin)}`, platformId);
  };

  const handleDisconnect = async (platformId: string) => {
    setDisconnectingPlatform(platformId);
    try {
      await disconnectSocialAccount(platformId);
      await refreshProfile();
      toast.success(`Disconnected from ${platformId}`);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error('Failed to disconnect account');
    } finally {
      setDisconnectingPlatform(null);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto mt-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const { snelstackLang } = getConfig();

  return (
    <div className="max-w-3xl mx-auto mt-6 pb-12 space-y-6">

      {/* Snelstack Detection Banner */}
      {snelstackLang !== null ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #7c3aed)' }}>
          <Zap size={16} className="shrink-0" />
          <span>
            <strong>Snelstack detected</strong> — site default language is <strong>{snelstackLang.toUpperCase()}</strong>. Full language flow enabled.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
          <Zap size={16} className="shrink-0" />
          <span>No Snelstack theme detected — content published as-is.</span>
        </div>
      )}

      {/* Account Settings Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Account <em className="font-serif font-normal italic">Settings</em>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Your login info and how you appear on social posts
          </p>
        </div>

        <div className="px-6 py-6 flex items-start gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <button
              type="button"
              className="group relative rounded-full"
              onClick={() => fileInputRef.current?.click()}
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Avatar"
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <Avatar
                  size={64}
                  name={user?.email || 'user'}
                  variant="beam"
                  colors={['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#60a5fa']}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/40">
                <Pencil size={14} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarSelect(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              Change
            </button>
          </div>

          {/* Name + Email fields */}
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleSaveUser}
            disabled={savingUser || !hasUserChanges || !userName.trim() || !userEmail.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {savingUser ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {savingUser ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Profile Settings Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Profile <em className="font-serif font-normal italic">Settings</em>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            This helps AI create better content for your business
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-5">
          {/* Niche */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              What's your specialty?{" "}
              <span className="font-normal text-gray-500">(Niche)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., web design, stress management, SEO"
              value={profile?.niche || ""}
              onChange={(e) =>
                setProfile((prev) =>
                  prev ? { ...prev, niche: e.target.value } : null
                )
              }
              className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Who's it for?{" "}
              <span className="font-normal text-gray-500">
                (Target audience)
              </span>
            </label>
            <input
              type="text"
              placeholder="e.g., small business owners"
              value={profile?.target_audience || ""}
              onChange={(e) =>
                setProfile((prev) =>
                  prev ? { ...prev, target_audience: e.target.value } : null
                )
              }
              className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Brand Voice */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Brand voice
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BRAND_VOICES.map((voice) => (
                <button
                  key={voice}
                  type="button"
                  onClick={() =>
                    setProfile((prev) =>
                      prev ? { ...prev, brand_voice: voice } : null
                    )
                  }
                  className={`h-11 px-4 rounded-lg text-sm font-medium transition-colors ${
                    profile?.brand_voice === voice
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {voice.charAt(0).toUpperCase() + voice.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Content language
            </label>
            <select
              value={profile?.content_lang || "en"}
              onChange={(e) =>
                setProfile((prev) =>
                  prev ? { ...prev, content_lang: e.target.value as 'en' | 'nl' } : null
                )
              }
              className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="en">English</option>
              <option value="nl">Nederlands</option>
            </select>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Timezone
            </label>
            <TimezonePicker
              value={profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
              onChange={(tz) =>
                setProfile((prev) =>
                  prev ? { ...prev, timezone: tz } : null
                )
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSaving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Connected Accounts Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Connected <em className="font-serif font-normal italic">Accounts</em>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Post directly to your social media accounts
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 divide-y divide-gray-100">
          {mergedPlatforms.map((platform) => (
            <div
              key={platform.id}
              className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className={`w-10 h-10 ${platform.bgColor} text-white rounded-lg flex items-center justify-center`}
                  >
                    <platform.Icon size={20} />
                  </div>
                  {platform.connected && platform.profilePicture && (
                    <img
                      src={platform.profilePicture}
                      alt=""
                      className="absolute -bottom-2.5 -right-2.5 w-7 h-7 rounded-full border-2 border-white"
                    />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{platform.name}</h3>
                  {platform.connected ? (
                    <>
                      <p className="text-sm text-green-600 flex items-center gap-1">
                        <Check size={14} />
                        Connected as @{platform.username}
                      </p>
                      {platform.id === 'facebook' && platform.meta?.pages && platform.meta.pages.length > 0 && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Posting to <strong>{platform.meta.pages[0].name}</strong>
                        </p>
                      )}
                      {platform.id === 'facebook' && (!platform.meta?.pages || platform.meta.pages.length === 0) && (
                        <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                          <AlertTriangle size={12} />
                          No Facebook Pages found. Create a Page on Facebook, then reconnect to publish.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Not connected</p>
                  )}
                </div>
              </div>

              {platform.connected ? (
                <button
                  onClick={() => handleDisconnect(platform.id)}
                  disabled={disconnectingPlatform === platform.id}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {disconnectingPlatform === platform.id ? (
                    <><Loader2 size={14} className="animate-spin" /> Disconnecting...</>
                  ) : (
                    'Disconnect'
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(platform.id)}
                  disabled={connectingPlatform === platform.id}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {connectingPlatform === platform.id ? (
                    <><Loader2 size={14} className="animate-spin" /> Connecting...</>
                  ) : (
                    <>Connect <ExternalLink size={14} /></>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <p className="text-sm text-gray-600">
            We never post without your permission.
          </p>
        </div>
      </div>
    </div>
  );
}
