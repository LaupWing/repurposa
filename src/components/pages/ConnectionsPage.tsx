/**
 * Connections Page
 *
 * Profile settings + social media connections.
 */

import { useState, useEffect } from "@wordpress/element";
import apiFetch from "@wordpress/api-fetch";
import { toast } from "sonner";
import {
  Twitter,
  Linkedin,
  Check,
  ExternalLink,
  Save,
  Loader2,
} from "lucide-react";
import type { ProfileData } from "../OnboardingModal";

// ============================================
// TYPES
// ============================================

interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  username?: string;
  color: string;
}

// ============================================
// CONSTANTS
// ============================================

const BUSINESS_TYPES = [
  { value: "coaching", label: "Coaching" },
  { value: "consulting", label: "Consulting" },
  { value: "course", label: "Course" },
  { value: "digital-products", label: "Digital Products" },
  { value: "saas", label: "SaaS" },
  { value: "agency", label: "Agency" },
  { value: "freelance", label: "Freelance Services" },
  { value: "ecommerce", label: "eCommerce" },
  { value: "newsletter", label: "Newsletter" },
  { value: "membership", label: "Membership / Community" },
  { value: "content-creator", label: "Content Creator" },
  { value: "local-business", label: "Local Business" },
  { value: "other", label: "Other" },
];

const BRAND_VOICES = ["conversational", "professional", "bold"] as const;

const platforms: SocialPlatform[] = [
  {
    id: "twitter",
    name: "Twitter / X",
    icon: <Twitter size={20} />,
    connected: false,
    color: "bg-black",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: <Linkedin size={20} />,
    connected: false,
    color: "bg-blue-700",
  },
];

// ============================================
// COMPONENT
// ============================================

export default function ConnectionsPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load profile on mount
  useEffect(() => {
    apiFetch<{ profile: ProfileData | null }>({ path: "/wbrp/v1/profile" })
      .then((response) => {
        if (response.profile) {
          setProfile(response.profile);
        }
      })
      .catch((error) => {
        console.error("Failed to load profile:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      await apiFetch({
        path: "/wbrp/v1/profile",
        method: "POST",
        data: profile,
      });
      toast.success("Profile saved!");
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnect = (platformId: string) => {
    console.log("Connecting to:", platformId);
    alert(`Connect to ${platformId} - OAuth flow coming soon!`);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      {/* Profile Settings Section */}
      <div className="mb-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your profile and connected accounts
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Profile Settings
          </h2>

          <div className="space-y-4">
            {/* Business Type */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                What do you sell?{" "}
                <span className="font-normal text-gray-500">
                  (Business type)
                </span>
              </label>
              <select
                value={profile?.business_type || ""}
                onChange={(e) =>
                  setProfile((prev) =>
                    prev ? { ...prev, business_type: e.target.value } : null
                  )
                }
                className="w-full h-11 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Select...</option>
                {BUSINESS_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

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

            {/* Save Button */}
            <div className="pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
        </div>
      </div>

      {/* Social Connections Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Connected Accounts
        </h2>

        <div className="grid gap-4">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className="bg-white rounded-lg border border-gray-200 p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 ${platform.color} text-white rounded-lg flex items-center justify-center`}
                >
                  {platform.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{platform.name}</h3>
                  {platform.connected ? (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <Check size={14} />
                      Connected as @{platform.username}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">Not connected</p>
                  )}
                </div>
              </div>

              {platform.connected ? (
                <button className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(platform.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Connect
                  <ExternalLink size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-blue-600">Note:</span>{" "}
            Connecting your accounts allows you to post directly from this
            plugin. We never post without your permission.
          </p>
        </div>
      </div>
    </div>
  );
}
