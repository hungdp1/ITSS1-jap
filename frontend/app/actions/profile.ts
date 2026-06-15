"use server";

import { revalidatePath } from "next/cache";
import { apiGet, apiPut } from "@/lib/api";

export type ProfileLanguage = {
    name: string;
    levelText: string;
    levelType: "native" | "learning";
    jlptLevel?: string | null;
    type?: string | null;
    level?: string | null;
    proficiency: number;
};

export type ProfileEditPayload = {
    displayName: string;
    location: string;
    bio: string;
    languages: { language: string; type: string | null; level: string | null }[];
    hobbies: string[];
    purposes: string[];
};

export type ProfilePurpose = {
    label: string;
    emoji: string;
};

export type ProfileInterest = {
    name: string;
    icon: string;
};

export type ProfileEvent = {
    id: number;
    title: string;
    dateLabel: string;
    timeLabel: string;
    statusLabel: string;
};

export type UserProfile = {
    id: number;
    name: string;
    firstName?: string | null;
    lastName?: string | null;
    age: number | null;
    location: string;
    bio: string;
    avatarUrl: string;
    gallery: string[];
    isVerified: boolean;
    isOnline: boolean;
    mutualFriendsCount: number;
    purposes: ProfilePurpose[];
    languages: ProfileLanguage[];
    interests: ProfileInterest[];
    upcomingEvent: ProfileEvent | null;
    viewType: "own" | "other";
    isLiked?: boolean;
    hasPassed?: boolean;
    isMutualMatch?: boolean;
    chatSessionId?: number | null;
};

export async function getMyProfileAction(): Promise<{
    success: boolean;
    message?: string;
    data?: UserProfile;
}> {
    const result = await apiGet<UserProfile>("/profiles");

    if (!result.ok) {
        return { success: false, message: result.message };
    }

    return { success: true, data: result.data };
}

export async function getUserProfileAction(userId: string): Promise<{
    success: boolean;
    message?: string;
    data?: UserProfile;
}> {
    const result = await apiGet<UserProfile>(`/profiles/${userId}`);

    if (!result.ok) {
        return { success: false, message: result.message };
    }

    return { success: true, data: result.data };
}

function splitDisplayName(displayName: string) {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    return {
        firstName: parts[0] ?? "",
        lastName: parts.slice(1).join(" ") || null,
    };
}

export async function saveProfileAction(
    userId: number,
    payload: ProfileEditPayload
): Promise<{ success: boolean; message?: string; data?: UserProfile }> {
    const { firstName, lastName } = splitDisplayName(payload.displayName);

    const basic = await apiPut("/profiles/basic", {
        firstName,
        lastName,
        location: payload.location.trim() || null,
        bio: payload.bio.trim() || null,
    });

    if (!basic.ok) {
        return { success: false, message: basic.message };
    }

    const languages = await apiPut("/profiles/languages", {
        languages: payload.languages.map((l) => ({
            language: l.language,
            type: l.type,
            level: l.level,
        })),
    });

    if (!languages.ok) {
        return { success: false, message: languages.message };
    }

    const hobbies = await apiPut("/profiles/hobbies", {
        hobbies: payload.hobbies,
    });

    if (!hobbies.ok) {
        return { success: false, message: hobbies.message };
    }

    const purposes = await apiPut("/profiles/purposes", {
        purposes: payload.purposes,
    });

    if (!purposes.ok) {
        const hint =
            purposes.status === 404
                ? "（バックエンドを再起動してください: PUT /api/profiles/purposes）"
                : "";
        return {
            success: false,
            message: `${purposes.message}${hint}`,
        };
    }

    revalidatePath(`/profile/${userId}`);
    revalidatePath("/profile");

    const refreshed = await apiGet<UserProfile>(`/profiles/${userId}`);
    if (!refreshed.ok) {
        return { success: true };
    }

    return { success: true, data: refreshed.data };
}
