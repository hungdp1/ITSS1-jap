type ErrorBannerProps = {
    message: string;
    className?: string;
};

export default function ErrorBanner({ message, className = "" }: ErrorBannerProps) {
    return (
        <div
            role="alert"
            className={[
                "rounded-2xl border border-[#923118]/20 bg-[#FFF3EF] px-4 py-3 text-[14px] font-medium text-[#923118]",
                className,
            ].join(" ")}
        >
            {message}
        </div>
    );
}
