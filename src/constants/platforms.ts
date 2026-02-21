import { RiTwitterXFill, RiLinkedinFill, RiThreadsFill, RiInstagramFill, RiFacebookFill } from "react-icons/ri";
import type { IconType } from "react-icons";

export interface SocialPlatform {
    id: string;
    name: string;
    Icon: IconType;
    bgColor: string;
    textColor: string;
}

export const CONNECT_PLATFORMS: SocialPlatform[] = [
    { id: "twitter", name: "X / Twitter", Icon: RiTwitterXFill, bgColor: "bg-black", textColor: "text-black" },
    { id: "linkedin", name: "LinkedIn", Icon: RiLinkedinFill, bgColor: "bg-blue-700", textColor: "text-[#0A66C2]" },
    { id: "threads", name: "Threads", Icon: RiThreadsFill, bgColor: "bg-gray-900", textColor: "text-gray-900" },
    { id: "instagram", name: "Instagram", Icon: RiInstagramFill, bgColor: "bg-gradient-to-br from-purple-600 to-pink-500", textColor: "text-[#E4405F]" },
    { id: "facebook", name: "Facebook", Icon: RiFacebookFill, bgColor: "bg-blue-600", textColor: "text-[#1877F2]" },
];
