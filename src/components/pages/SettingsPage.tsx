/**
 * Settings Page
 *
 * Profile settings + social media connections.
 * Centered layout matching BlogWizard design.
 */

import { useState, useEffect, useRef } from "@wordpress/element";
import { toast } from "sonner";
import { Check, ExternalLink, Save, Loader2 } from "lucide-react";
import { TimezonePicker } from "../TimezonePicker";
import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from "react-icons/ri";
import { useProfile } from "../../context/ProfileContext";
import type { ProfileData } from "../../context/ProfileContext";
import { disconnectSocialAccount } from "../../services/api";

// ============================================
// TYPES
// ============================================

interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  username?: string;
  profilePicture?: string | null;
  color: string;
  comingSoon?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const BRAND_VOICES = ["conversational", "professional", "bold"] as const;

const platforms: SocialPlatform[] = [
  {
    id: "twitter",
    name: "X",
    icon: <RiTwitterXFill size={20} />,
    connected: false,
    color: "bg-black",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: <RiLinkedinFill size={20} />,
    connected: false,
    color: "bg-blue-700",
  },
  {
    id: "threads",
    name: "Threads",
    icon: <RiThreadsFill size={20} />,
    connected: false,
    color: "bg-gray-900",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: <RiInstagramFill size={20} />,
    connected: false,
    color: "bg-gradient-to-br from-purple-600 to-pink-500",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <RiFacebookFill size={20} />,
    connected: false,
    color: "bg-blue-600",
  },
];

// ============================================
// COMPONENT
// ============================================

export default function SettingsPage() {
  const { profile: contextProfile, socialConnections, isLoading, saveProfile, refreshProfile } = useProfile();
  const [localProfile, setLocalProfile] = useState<ProfileData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [disconnectingPlatform, setDisconnectingPlatform] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);

  // Sync context profile to local state for editing
  if (contextProfile && !initialized) {
    setLocalProfile(contextProfile);
    setInitialized(true);
  }

  const profile = localProfile;
  const setProfile = setLocalProfile;

  // Merge social connections into platforms
  const mergedPlatforms = platforms.map((platform) => {
    const connection = socialConnections.find((c) => c.platform === platform.id);
    if (connection) {
      return { ...platform, connected: true, username: connection.username, profilePicture: connection.profilePicture };
    }
    return platform;
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

  const handleConnect = (platformId: string) => {
    const { apiUrl } = window.wbrpConfig || { apiUrl: 'http://127.0.0.1:8000' };
    const origin = window.location.origin;

    setConnectingPlatform(platformId);

    const popup = window.open(
      `${apiUrl}/social/${platformId}/connect?origin=${encodeURIComponent(origin)}`,
      'wbrp-social-auth',
      'width=600,height=700,scrollbars=yes'
    );
    popupRef.current = popup;

    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type !== 'social-connected') return;

      window.removeEventListener('message', handleMessage);
      clearInterval(checkClosed);

      try {
        await refreshProfile();
        toast.success(`Connected to ${event.data.platform || platformId}!`);
      } catch (error) {
        console.error('Failed to refresh profile after connect:', error);
        toast.error('Connected but failed to refresh. Please reload the page.');
      } finally {
        setConnectingPlatform(null);
        popupRef.current = null;
      }
    };

    window.addEventListener('message', handleMessage);

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        setConnectingPlatform(null);
        popupRef.current = null;
      }
    }, 500);
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

  // Cleanup popup ref on unmount
  useEffect(() => {
    return () => {
      popupRef.current = null;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto mt-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-6 space-y-6">
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
              value={profile?.lang || "en"}
              onChange={(e) =>
                setProfile((prev) =>
                  prev ? { ...prev, lang: e.target.value as 'en' | 'nl' } : null
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
              className={`flex items-center justify-between py-4 first:pt-0 last:pb-0 ${platform.comingSoon ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div
                    className={`w-10 h-10 ${platform.comingSoon ? 'bg-gray-300' : platform.color} text-white rounded-lg flex items-center justify-center`}
                  >
                    {platform.icon}
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
                  {platform.comingSoon ? (
                    <p className="text-sm text-gray-400">Coming soon</p>
                  ) : platform.connected ? (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Check size={14} />
                      Connected as @{platform.username}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">Not connected</p>
                  )}
                </div>
              </div>

              {platform.comingSoon ? (
                <span className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-100 rounded-lg">
                  Coming soon
                </span>
              ) : platform.connected ? (
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
