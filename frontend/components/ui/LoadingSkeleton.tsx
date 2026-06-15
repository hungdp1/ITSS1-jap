type LoadingSkeletonProps = {
    count?: number;
    className?: string;
};

export default function LoadingSkeleton({ count = 6, className = "" }: LoadingSkeletonProps) {
    return (
        <div className={["grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3", className].join(" ")}>
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="h-72 animate-pulse rounded-[28px] border border-[#D9C7A5]/60 bg-[#FFFDF7] shadow-[0_14px_32px_rgba(79,55,30,0.08)]"
                >
                    <div className="h-32 rounded-t-[28px] bg-[#F8EEDB]" />
                    <div className="space-y-3 p-5">
                        <div className="h-4 w-2/3 rounded bg-[#DDEDEA]" />
                        <div className="h-3 w-full rounded bg-[#F3E7D2]" />
                        <div className="h-3 w-4/5 rounded bg-[#F3E7D2]" />
                    </div>
                </div>
            ))}
        </div>
    );
}
