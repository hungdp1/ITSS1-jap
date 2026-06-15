import GroupDetailClient from "@/app/community/[groupId]/GroupDetailClient";

export default async function CommunityGroupPage({
    params,
}: {
    params: Promise<{ groupId: string }>;
}) {
    const { groupId: groupIdStr } = await params;
    const groupId = Number(groupIdStr);

    if (!groupId || Number.isNaN(groupId)) {
        return <GroupDetailClient groupId={0} invalid />;
    }

    return <GroupDetailClient groupId={groupId} />;
}
