"use client";

import Image from "next/image";
import { useState } from "react";
import { resolveImageUrl } from "@/lib/image";

type UserAvatarProps = {
    name?: string | null;
    src?: string | null;
    size?: number;
    className?: string;
    priority?: boolean;
};

function initialFromName(name?: string | null) {
    const trimmed = name?.trim();
    return trimmed ? trimmed[0]?.toUpperCase() : "T";
}

export default function UserAvatar({
    name,
    src,
    size = 40,
    className = "",
    priority = false,
}: UserAvatarProps) {
    const [failed, setFailed] = useState(false);
    const imageSrc = resolveImageUrl(failed ? null : src);

    return (
        <div
            className={[
                "relative shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#005B5B] to-[#2DD4BF] text-white shadow-sm",
                className,
            ].join(" ")}
            style={{ width: size, height: size }}
        >
            {!failed && imageSrc ? (
                <Image
                    src={imageSrc}
                    alt={name || "ユーザー"}
                    fill
                    sizes={`${size}px`}
                    priority={priority}
                    className="object-cover"
                    onError={() => setFailed(true)}
                />
            ) : (
                <span className="flex h-full w-full items-center justify-center text-[14px] font-black">
                    {initialFromName(name)}
                </span>
            )}
        </div>
    );
}
