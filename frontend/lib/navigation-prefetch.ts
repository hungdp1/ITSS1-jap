import { prefetchChatInbox } from "@/lib/chat-client";
import { prefetchCommunityHome } from "@/lib/community-client";
import { prefetchEventsList } from "@/lib/events-client";
import { prefetchMatchingHome } from "@/lib/matching-client";

export function prefetchForPath(pathname: string, sessionId?: number | null) {
    if (pathname.startsWith("/matching")) {
        prefetchMatchingHome();
        return;
    }

    if (pathname === "/community") {
        prefetchCommunityHome();
        return;
    }

    if (pathname.startsWith("/events")) {
        prefetchEventsList();
        return;
    }

    if (pathname.startsWith("/chat")) {
        prefetchChatInbox(sessionId);
        return;
    }

    if (pathname.startsWith("/profile/")) {
        const userId = pathname.split("/")[2];
        if (userId && userId !== "edit") {
            void import("@/lib/profile-client").then(({ prefetchProfile }) => prefetchProfile(userId));
        }
    }
}
