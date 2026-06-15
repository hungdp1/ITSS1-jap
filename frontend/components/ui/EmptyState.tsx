import type { ReactNode } from "react";

type EmptyStateProps = {
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
};

export default function EmptyState({
    title,
    description,
    action,
    className = "",
}: EmptyStateProps) {
    return (
        <div
            className={[
                "flex flex-col items-center justify-center gap-4 rounded-[28px] border border-[#D9C7A5]/70 bg-[#FFFDF7] px-6 py-16 text-center shadow-[0_16px_40px_rgba(79,55,30,0.08)]",
                className,
            ].join(" ")}
        >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#005B5B]/15 bg-[#DDEDEA] text-[#005B5B] shadow-sm">
                <span className="text-2xl" aria-hidden="true">⌕</span>
            </div>
            <div className="space-y-1">
                <h3 className="text-[18px] font-bold text-[#181D1B]">{title}</h3>
                {description && (
                    <p className="text-[14px] leading-6 text-[#6E7979]">{description}</p>
                )}
            </div>
            {action}
        </div>
    );
}
