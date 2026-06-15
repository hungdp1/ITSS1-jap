"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { prefetchForPath } from "@/lib/navigation-prefetch";
import { useAuth } from "@/lib/auth-context";

type NavLink = {
    name: string;
    path: string;
    icon: React.ReactNode;
};

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();

    const navLinks: NavLink[] = [
        {
            name: "マッチ",
            path: "/matching",
            icon: (
                <svg
                    className="transition-transform duration-300 group-hover:scale-110"
                    width="20"
                    height="19"
                    viewBox="0 0 20 19"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                >
                    <path
                        d="M10 18.35L8.55 17.05C6.86667 15.5333 5.475 14.225 4.375 13.125C3.275 12.025 2.4 11.0375 1.75 10.1625C1.1 9.2875 0.645833 8.48333 0.3875 7.75C0.129167 7.01667 0 6.26667 0 5.5C0 3.93333 0.525 2.625 1.575 1.575C2.625 0.525 3.93333 0 5.5 0C6.36667 0 7.19167 0.183333 7.975 0.55C8.75833 0.916667 9.43333 1.43333 10 2.1C10.5667 1.43333 11.2417 0.916667 12.025 0.55C12.8083 0.183333 13.6333 0 14.5 0C16.0667 0 17.375 0.525 18.425 1.575C19.475 2.625 20 3.93333 20 5.5C20 6.26667 19.8708 7.01667 19.6125 7.75C19.3542 8.48333 18.9 9.2875 18.25 10.1625C17.6 11.0375 16.725 12.025 15.625 13.125C14.525 14.225 13.1333 15.5333 11.45 17.05L10 18.35ZM10 15.65C11.6 14.2167 12.9167 12.9875 13.95 11.9625C14.9833 10.9375 15.8 10.0458 16.4 9.2875C17 8.52917 17.4167 7.85417 17.65 7.2625C17.8833 6.67083 18 6.08333 18 5.5C18 4.5 17.6667 3.66667 17 3C16.3333 2.33333 15.5 2 14.5 2C13.7167 2 12.9917 2.22083 12.325 2.6625C11.6583 3.10417 11.2 3.66667 10.95 4.35H9.05C8.8 3.66667 8.34167 3.10417 7.675 2.6625C7.00833 2.22083 6.28333 2 5.5 2C4.5 2 3.66667 2.33333 3 3C2.33333 3.66667 2 4.5 2 5.5C2 6.08333 2.11667 6.67083 2.35 7.2625C2.58333 7.85417 3 8.52917 3.6 9.2875C4.2 10.0458 5.01667 10.9375 6.05 11.9625C7.08333 12.9875 8.4 14.2167 10 15.65Z"
                        fill="currentColor"
                    />
                </svg>
            ),
        },
        {
            name: "コミュニティ",
            path: "/community",
            icon: (
                <svg
                    className="transition-transform duration-300 group-hover:scale-110"
                    width="24"
                    height="12"
                    viewBox="0 0 24 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                >
                    <path
                        d="M0 12V10.425C0 9.70833 0.366667 9.125 1.1 8.675C1.83333 8.225 2.8 8 4 8C4.21667 8 4.425 8.00417 4.625 8.0125C4.825 8.02083 5.01667 8.04167 5.2 8.075C4.96667 8.425 4.79167 8.79167 4.675 9.175C4.55833 9.55833 4.5 9.95833 4.5 10.375V12H0ZM6 12V10.375C6 9.84167 6.14583 9.35417 6.4375 8.9125C6.72917 8.47083 7.14167 8.08333 7.675 7.75C8.20833 7.41667 8.84583 7.16667 9.5875 7C10.3292 6.83333 11.1333 6.75 12 6.75C12.8833 6.75 13.6958 6.83333 14.4375 7C15.1792 7.16667 15.8167 7.41667 16.35 7.75C16.8833 8.08333 17.2917 8.47083 17.575 8.9125C17.8583 9.35417 18 9.84167 18 10.375V12H6ZM19.5 12V10.375C19.5 9.94167 19.4458 9.53333 19.3375 9.15C19.2292 8.76667 19.0667 8.40833 18.85 8.075C19.0333 8.04167 19.2208 8.02083 19.4125 8.0125C19.6042 8.00417 19.8 8 20 8C21.2 8 22.1667 8.22083 22.9 8.6625C23.6333 9.10417 24 9.69167 24 10.425V12H19.5ZM8.125 10H15.9C15.7333 9.66667 15.2708 9.375 14.5125 9.125C13.7542 8.875 12.9167 8.75 12 8.75C11.0833 8.75 10.2458 8.875 9.4875 9.125C8.72917 9.375 8.275 9.66667 8.125 10ZM4 7C3.45 7 2.97917 6.80417 2.5875 6.4125C2.19583 6.02083 2 5.55 2 5C2 4.43333 2.19583 3.95833 2.5875 3.575C2.97917 3.19167 3.45 3 4 3C4.56667 3 5.04167 3.19167 5.425 3.575C5.80833 3.95833 6 4.43333 6 5C6 5.55 5.80833 6.02083 5.425 6.4125C5.04167 6.80417 4.56667 7 4 7ZM20 7C19.45 7 18.9792 6.80417 18.5875 6.4125C18.1958 6.02083 18 5.55 18 5C18 4.43333 18.1958 3.95833 18.5875 3.575C18.9792 3.19167 19.45 3 20 3C20.5667 3 21.0417 3.19167 21.425 3.575C21.8083 3.95833 22 4.43333 22 5C22 5.55 21.8083 6.02083 21.425 6.4125C21.0417 6.80417 20.5667 7 20 7ZM12 6C11.1667 6 10.4583 5.70833 9.875 5.125C9.29167 4.54167 9 3.83333 9 3C9 2.15 9.29167 1.4375 9.875 0.8625C10.4583 0.2875 11.1667 0 12 0C12.85 0 13.5625 0.2875 14.1375 0.8625C14.7125 1.4375 15 2.15 15 3C15 3.83333 14.7125 4.54167 14.1375 5.125C13.5625 5.70833 12.85 6 12 6ZM12 4C12.2833 4 12.5208 3.90417 12.7125 3.7125C12.9042 3.52083 13 3.28333 13 3C13 2.71667 12.9042 2.47917 12.7125 2.2875C12.5208 2.09583 12.2833 2 12 2C11.7167 2 11.4792 2.09583 11.2875 2.2875C11.0958 2.47917 11 2.71667 11 3C11 3.28333 11.0958 3.52083 11.2875 3.7125C11.4792 3.90417 11.7167 4 12 4Z"
                        fill="currentColor"
                    />
                </svg>
            ),
        },
        {
            name: "チャット",
            path: "/chat",
            icon: (
                <svg
                    className="transition-transform duration-300 group-hover:scale-110"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                >
                    <path
                        d="M0 20V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H4L0 20ZM3.15 14H18V2H2V15.125L3.15 14ZM2 14V2V14Z"
                        fill="currentColor"
                    />
                </svg>
            ),
        },
        {
            name: "プロフィール",
            path: "/profile",
            icon: (
                <svg
                    className="transition-transform duration-300 group-hover:scale-110"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden
                >
                    <path
                        d="M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8ZM0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0ZM2 14H14V13.2C14 13.0167 13.9542 12.85 13.8625 12.7C13.7708 12.55 13.65 12.4333 13.5 12.35C12.6 11.9 11.6917 11.5625 10.775 11.3375C9.85833 11.1125 8.93333 11 8 11C7.06667 11 6.14167 11.1125 5.225 11.3375C4.30833 11.5625 3.4 11.9 2.5 12.35C2.35 12.4333 2.22917 12.55 2.1375 12.7C2.04583 12.85 2 13.0167 2 13.2V14ZM8 6C8.55 6 9.02083 5.80417 9.4125 5.4125C9.80417 5.02083 10 4.55 10 4C10 3.45 9.80417 2.97917 9.4125 2.5875C9.02083 2.19583 8.55 2 8 2C7.45 2 6.97917 2.19583 6.5875 2.5875C6.19583 2.97917 6 3.45 6 4C6 4.55 6.19583 5.02083 6.5875 5.4125C6.97917 5.80417 7.45 6 8 6Z"
                        fill="currentColor"
                    />
                </svg>
            ),
        },
    ];

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
    };

    const isActivePath = (path: string) => {
        if (path === "/profile") return pathname.startsWith("/profile");
        return pathname.startsWith(path);
    };

    const navContent = navLinks.map((link) => {
        const hrefPath = link.path === "/profile" && user?.id ? `/profile/${user.id}` : link.path;
        const isActive = isActivePath(link.path);

        return (
            <Link
                key={link.name}
                href={hrefPath}
                onMouseEnter={() => prefetchForPath(hrefPath)}
                onFocus={() => prefetchForPath(hrefPath)}
                className={`group relative flex min-h-[64px] items-center gap-4 overflow-hidden rounded-[22px] border px-5 py-4 transition-all duration-300 ease-out active:scale-[0.98] ${isActive
                        ? "border-[#F6EAD5]/20 bg-gradient-to-r from-white/16 via-white/10 to-[#2DD4BF]/10 text-white shadow-[0_18px_45px_rgba(0,0,0,0.22)]"
                        : "border-transparent text-white/60 hover:translate-x-1 hover:border-white/8 hover:bg-white/8 hover:text-white"
                    }`}
            >
                {isActive && (
                    <>
                        <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#F6EAD5] via-[#2DD4BF] to-[#E76F51] shadow-[0_0_18px_rgba(45,212,191,0.85)]" />
                        <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-white/10" />
                    </>
                )}

                <div
                    className={`transition-colors duration-300 ${isActive
                            ? "text-[#8FF7E6] drop-shadow-[0_0_8px_rgba(45,212,191,0.45)]"
                            : "text-white/60 group-hover:text-[#F6EAD5]"
                        }`}
                >
                    {link.icon}
                </div>

                <span
                    className={`text-[14px] transition-colors duration-300 ${isActive
                            ? "font-bold text-white"
                            : "font-medium text-white/65 group-hover:text-white"
                        }`}
                >
                    {link.name}
                </span>
            </Link>
        );
    });

    return (
        <>
            <aside className="sticky top-0 z-50 hidden h-screen w-64 flex-col justify-between overflow-hidden border-r border-[#D9C7A5]/10 bg-[radial-gradient(circle_at_top_left,rgba(231,111,81,0.12),transparent_34%),linear-gradient(180deg,#062926_0%,#073B36_48%,#0A4A43_100%)] px-6 py-10 shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.04),6px_0_40px_rgba(0,0,0,0.22)] md:flex">
                <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-[#2DD4BF]/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-[#E76F51]/10 blur-3xl" />

                <div className="relative z-10">
                    <Link
                        href="/matching"
                        className="mb-12 flex flex-col px-3"
                        onMouseEnter={() => prefetchForPath("/matching")}
                        onFocus={() => prefetchForPath("/matching")}
                    >
                        <h1 className="text-[26px] leading-8 font-black tracking-tight text-white">
                            Tomoio
                        </h1>
                        <span className="mt-2 h-1.5 w-12 rounded-full bg-gradient-to-r from-[#F6EAD5] via-[#E76F51] to-[#2DD4BF]" />
                    </Link>

                    <nav className="flex flex-col gap-2.5">{navContent}</nav>
                </div>

                <div className="relative z-10 border-t border-white/8 pt-6">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="group flex w-full cursor-pointer items-center justify-center gap-3 rounded-[22px] border border-white/8 bg-white/7 px-4 py-3.5 text-white/72 shadow-sm transition-all duration-300 ease-out hover:border-[#E76F51]/25 hover:bg-[#E76F51]/12 hover:text-[#F8E0D5] active:scale-[0.98]"
                    >
                        <svg
                            className="transition-transform duration-300 group-hover:translate-x-0.5"
                            width="15"
                            height="15"
                            viewBox="0 0 15 15"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden
                        >
                            <path
                                d="M1.66667 15C1.20833 15 0.815972 14.8368 0.489583 14.5104C0.163194 14.184 0 13.7917 0 13.3333V1.66667C0 1.20833 0.163194 0.815972 0.489583 0.489583C0.815972 0.163194 1.20833 0 1.66667 0H7.5V1.66667H1.66667V13.3333H7.5V15H1.66667ZM10.8333 11.6667L9.6875 10.4583L11.8125 8.33333H5V6.66667H11.8125L9.6875 4.54167L10.8333 3.33333L15 7.5L10.8333 11.6667Z"
                                fill="currentColor"
                            />
                        </svg>
                        <span className="text-[14px] font-bold">ログアウト</span>
                    </button>
                </div>
            </aside>

            <nav className="fixed right-3 bottom-3 left-3 z-50 grid grid-cols-4 gap-1 rounded-[24px] border border-[#D9C7A5]/20 bg-[#062926]/94 p-2 shadow-[0_18px_45px_rgba(0,0,0,0.28)] backdrop-blur-xl md:hidden">
                {navLinks.map((link) => {
                    const hrefPath =
                        link.path === "/profile" && user?.id ? `/profile/${user.id}` : link.path;
                    const isActive = isActivePath(link.path);

                    return (
                        <Link
                            key={link.name}
                            href={hrefPath}
                            aria-label={link.name}
                            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-bold transition-all ${isActive
                                    ? "bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                                    : "text-white/60 hover:bg-white/8 hover:text-white"
                                }`}
                        >
                            <span className={isActive ? "text-[#8FF7E6]" : "text-white/60"}>
                                {link.icon}
                            </span>
                            <span>{link.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
