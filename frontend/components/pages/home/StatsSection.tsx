import Image from "next/image";
import { fetchPublicStats } from "@/lib/stats-server";
import { resolveImageUrl } from "@/lib/image";

const FALLBACK_AVATARS = ["/assets/images/avatars/avatar-1.jpg", "/assets/images/avatars/avatar-2.jpg", "/assets/images/avatars/avatar-3.jpg"];

function formatExtraUserCount(count: number) {
    if (count >= 1000) {
        const thousands = count / 1000;
        const rounded =
            thousands >= 10
                ? Math.round(thousands).toString()
                : thousands.toFixed(1).replace(/\.0$/, "");
        return `+${rounded}k`;
    }

    return `+${count.toLocaleString("ja-JP")}`;
}

export default async function StatsSection() {
    const { activeUserCount, recentAvatars } = await fetchPublicStats();
    const displayAvatars =
        recentAvatars.length > 0
            ? recentAvatars.slice(0, 3).map((url) => resolveImageUrl(url))
            : FALLBACK_AVATARS.map((url) => resolveImageUrl(url));
    const extraUserCount = Math.max(activeUserCount - displayAvatars.length, 0);

    return (
        <section className="w-full max-w-296 mx-auto pt-4">
            <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-8 h-auto md:h-74.5">
                <div className="md:col-span-8 relative bg-surface rounded-3xl p-8 overflow-hidden flex flex-col justify-between h-full isolation-isolate">
                    <div className="absolute top-0 right-0 bottom-0 w-[33.33%] z-1">
                        <Image
                            src="/assets/images/home/city-bg.png"
                            alt="Cityscape"
                            fill
                            className="object-cover opacity-10"
                        />
                    </div>

                    <div className="relative z-2 flex flex-col items-start gap-4 max-w-md">
                        <div className="flex flex-row items-center gap-2">
                            <div className="text-[#923118] w-5.5 h-5.5 flex justify-center items-center">
                                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 8L16.75 5.25L14 4L16.75 2.75L18 0L19.25 2.75L22 4L19.25 5.25L18 8ZM18 22L16.75 19.25L14 18L16.75 16.75L18 14L19.25 16.75L22 18L19.25 19.25L18 22ZM8 19L5.5 13.5L0 11L5.5 8.5L8 3L10.5 8.5L16 11L10.5 13.5L8 19ZM8 14.15L9 12L11.15 11L9 10L8 7.85L7 10L4.85 11L7 12L8 14.15Z" fill="#923118" />
                                </svg>
                            </div>
                            <span className="text-[16px] font-medium text-[#923118] leading-6 tracking-[1.6px] uppercase">
                                文化交流の様子
                            </span>
                        </div>
                        <h3 className="text-[30px] font-medium text-text-main leading-9">
                            日常の風景を共有する
                        </h3>

                        <p className="text-[16px] font-medium text-text-muted leading-6.5">
                            コミュニティでは毎日、日本とベトナムの何気ない日常が共有されています。写真や動画を通じて、リアルな今を感じましょう。
                        </p>
                    </div>
                    <div className="relative z-2 flex flex-wrap gap-3 mt-auto pt-8">
                        <span className="bg-[#DFE3E1] px-4 py-2 rounded-full text-[12px] font-medium text-text-muted leading-4">
                            #日本の暮らし
                        </span>
                        <span className="bg-[#DFE3E1] px-4 py-2 rounded-full text-[12px] font-medium text-text-muted leading-4">
                            #ベトナムの食卓
                        </span>
                        <span className="bg-[#DFE3E1] px-4 py-2 rounded-full text-[12px] font-medium text-text-muted leading-4">
                            #週末の旅
                        </span>
                    </div>
                </div>

                <div className="md:col-span-4 bg-footer rounded-3xl flex flex-col justify-center items-center py-19.75 px-8 h-full">
                    <div className="mb-2">
                        <h2
                            className="text-[48px] font-black text-[#923118] leading-12"
                            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        >
                            {activeUserCount.toLocaleString("ja-JP")}
                        </h2>
                    </div>
                    <div className="mb-6">
                        <span className="text-[14px] font-medium text-text-muted leading-5 tracking-[1.4px] uppercase">
                            アクティブユーザー
                        </span>
                    </div>

                    <div className="flex flex-row justify-center items-center">
                        {displayAvatars.map((avatarSrc, index) => (
                            <div
                                key={`${avatarSrc}-${index}`}
                                className="w-10 h-10 rounded-full border-2 border-white bg-gray-400 overflow-hidden relative -mr-3"
                                style={{ zIndex: index + 1 }}
                            >
                                <Image
                                    src={avatarSrc}
                                    alt="User"
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ))}
                        {extraUserCount > 0 && (
                            <div className="w-10 h-10 rounded-full border-2 border-white bg-[#526160] flex justify-center items-center relative z-4">
                                <span
                                    className="text-[10px] font-bold text-white leading-3.75"
                                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                >
                                    {formatExtraUserCount(extraUserCount)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
