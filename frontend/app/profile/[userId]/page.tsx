import ProfilePageClient from "@/app/profile/[userId]/ProfilePageClient";

export default async function UserProfilePage({
    params,
}: {
    params: Promise<{ userId: string }>;
}) {
    const { userId } = await params;
    return <ProfilePageClient userId={userId} />;
}
