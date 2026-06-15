import CommunityClient from "@/app/community/CommunityClient";
import { apiGet } from "@/lib/api";
import {
    type ApiGroup,
    buildJoinedIdsFromGroups,
    formatGroupCard,
    formatJoinedGroup,
} from "@/lib/community-format";

type CommunityHomePayload = {
    myGroups: ApiGroup[];
    suggested: ApiGroup[];
    filterOptions?: { hobbyTags?: string[]; languageTags?: string[] };
};

// Server-render the initial community data so the page paints with content
// immediately instead of hydrating, then fetching, then showing skeletons.
export default async function CommunityPage() {
    const res = await apiGet<CommunityHomePayload>("/groups/community-home");

    if (!res.ok) {
        return <CommunityClient />;
    }

    const { myGroups = [], suggested = [], filterOptions } = res.data;
    const joinedGroups = myGroups.map(formatJoinedGroup);
    const joinedIds = buildJoinedIdsFromGroups(joinedGroups);
    const suggestedGroups = suggested.map((group, index) =>
        formatGroupCard(group, joinedIds, index)
    );

    return (
        <CommunityClient
            initialJoinedGroups={joinedGroups}
            initialSuggestedGroups={suggestedGroups}
            initialJoinedIds={[...joinedIds]}
            initialHobbyTagOptions={filterOptions?.hobbyTags ?? []}
        />
    );
}
