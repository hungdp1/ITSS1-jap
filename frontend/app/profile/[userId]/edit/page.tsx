import { redirect } from "next/navigation";

export default async function ProfileEditPage({
    params,
}: {
    params: Promise<{ userId: string }>;
}) {
    const { userId } = await params;
    redirect(`/profile/${userId}`);
}
