"use client";

import { useCallback, useEffect } from "react";

type ChatImagePreviewProps = {
    imageUrl: string;
    fileName?: string;
    onClose: () => void;
};

function getDownloadUrl(url: string) {
    if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
        return url.replace("/upload/", "/upload/fl_attachment/");
    }
    return url;
}

export default function ChatImagePreview({
    imageUrl,
    fileName = "image",
    onClose,
}: ChatImagePreviewProps) {
    const handleDownload = useCallback(() => {
        const link = document.createElement("a");
        link.href = getDownloadUrl(imageUrl);
        link.download = fileName;
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [imageUrl, fileName]);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[200] flex flex-col bg-[#0a0a0a]"
            role="dialog"
            aria-modal="true"
            aria-label="画像プレビュー"
        >
            <header className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10"
                    aria-label="戻る"
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                        <path
                            d="M12.5 15L7.5 10L12.5 5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>

                <button
                    type="button"
                    onClick={handleDownload}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10"
                    aria-label="ダウンロード"
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                        <path
                            d="M10 2.5V11.25M10 11.25L6.875 8.125M10 11.25L13.125 8.125M3.75 13.75V15.625C3.75 16.6605 4.58947 17.5 5.625 17.5H14.375C15.4105 17.5 16.25 16.6605 16.25 15.625V13.75"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </header>

            <div className="flex flex-1 min-h-0 items-center justify-center overflow-auto px-4 pb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={imageUrl}
                    alt={fileName}
                    className="max-w-full max-h-[calc(100dvh-5rem)] w-auto h-auto object-contain select-none"
                    draggable={false}
                />
            </div>
        </div>
    );
}
