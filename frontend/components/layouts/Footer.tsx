import Link from "next/link";

export default function Footer() {
    return (
        <footer className="w-full bg-footer border-t border-[#BEC9C8]/10">
            <div className="mx-auto px-6 py-12 flex justify-between items-center">
                <div className="flex flex-col items-start h-14">
                    <Link href="/" className="hover:opacity-80 transition-opacity">
                        <span
                            className="text-2xl font-bold leading-8 tracking-[-0.6px] text-[#115E59]"
                        >
                            Tomoio
                        </span>
                    </Link>
                    <div className="pt-1">
                        <span className="text-sm font-normal leading-5 text-[#64748B]">
                            日本と世界を、声でつなぐ cultural bridge
                        </span>
                    </div>
                </div>
                <div></div>
            </div>
        </footer>
    )
}