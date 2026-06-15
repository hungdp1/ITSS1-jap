"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    isLoading?: boolean;
    children: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
    primary:
        "bg-[#005B5B] text-white shadow-[0_10px_24px_-12px_rgba(0,91,91,0.65)] hover:bg-[#004A4A]",
    secondary:
        "border border-[#005B5B]/25 bg-white text-[#005B5B] hover:bg-[#E8F4F1]",
    danger:
        "border border-[#923118]/20 bg-[#923118]/8 text-[#923118] hover:bg-[#923118]/14",
    ghost:
        "bg-transparent text-[#526160] hover:bg-[#E8F4F1] hover:text-[#005B5B]",
};

export default function Button({
    variant = "primary",
    isLoading = false,
    disabled,
    className = "",
    children,
    type = "button",
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || isLoading}
            className={[
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-bold transition-all duration-200",
                "focus:outline-none focus-visible:ring-4 focus-visible:ring-[#005B5B]/20",
                "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
                variantClasses[variant],
                className,
            ].join(" ")}
            {...props}
        >
            {isLoading && (
                <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
            )}
            {children}
        </button>
    );
}
