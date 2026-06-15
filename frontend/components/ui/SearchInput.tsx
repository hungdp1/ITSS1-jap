"use client";

import type { InputHTMLAttributes } from "react";

type SearchInputProps = InputHTMLAttributes<HTMLInputElement> & {
    value: string;
    onValueChange: (value: string) => void;
};

export default function SearchInput({
    value,
    onValueChange,
    placeholder = "検索",
    className = "",
    ...props
}: SearchInputProps) {
    return (
        <label className={["relative block", className].join(" ")}>
            <span className="sr-only">検索</span>
            <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9AA7A4]"
                width="15"
                height="15"
                viewBox="0 0 15 15"
                fill="none"
                aria-hidden="true"
            >
                <path
                    d="M13.8333 15L8.58333 9.75C8.16667 10.0833 7.6875 10.3472 7.14583 10.5417C6.60417 10.7361 6.02778 10.8333 5.41667 10.8333C3.90278 10.8333 2.62153 10.309 1.57292 9.26042C0.524305 8.21181 0 6.93056 0 5.41667C0 3.90278 0.524305 2.62153 1.57292 1.57292C2.62153 0.524305 3.90278 0 5.41667 0C6.93056 0 8.21181 0.524305 9.26042 1.57292C10.309 2.62153 10.8333 3.90278 10.8333 5.41667C10.8333 6.02778 10.7361 6.60417 10.5417 7.14583C10.3472 7.6875 10.0833 8.16667 9.75 8.58333L15 13.8333L13.8333 15ZM5.41667 9.16667C6.45833 9.16667 7.34375 8.80208 8.07292 8.07292C8.80208 7.34375 9.16667 6.45833 9.16667 5.41667C9.16667 4.375 8.80208 3.48958 8.07292 2.76042C7.34375 2.03125 6.45833 1.66667 5.41667 1.66667C4.375 1.66667 3.48958 2.03125 2.76042 2.76042C2.03125 3.48958 1.66667 4.375 1.66667 5.41667C1.66667 6.45833 2.03125 7.34375 2.76042 8.07292C3.48958 8.80208 4.375 9.16667 5.41667 9.16667Z"
                    fill="currentColor"
                />
            </svg>
            <input
                type="search"
                value={value}
                placeholder={placeholder}
                onChange={(event) => onValueChange(event.target.value)}
                className="h-11 w-full rounded-2xl border border-transparent bg-[#F0F5F2] pl-11 pr-4 text-[14px] text-[#181D1B] outline-none transition-all placeholder:text-[#9AA7A4] hover:bg-[#E8F0ED] focus:border-[#005B5B]/25 focus:bg-white focus:ring-4 focus:ring-[#005B5B]/10"
                {...props}
            />
        </label>
    );
}
