import Link from "next/link";

export default function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 w-full h-18 bg-[#062926]/90 backdrop-blur-xl border-b border-white/5 shadow-md">
            <div className="mx-auto px-6 h-full flex items-center justify-between">
                <div className="flex items-center gap-16.5">
                    <Link href="/" className="flex items-center justify-center">
                        <span className="text-[22px] font-black tracking-tight text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Tomoio
                        </span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-8">
                        <Link
                            href="/"
                            className="text-sm font-medium text-accent relative after:content-[''] after-absolute after:-bottom-1 after:left-0 after:w-full after:h-0.5 after:bg-accent"
                        >
                            ホーム
                        </Link>
                        <Link
                            href="/community"
                            className="text-sm font-medium leading-5 text-[#E2E8F0] hover:text-white transition-colors"
                        >
                            コミュニティ
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center gap-4">
                    <Link
                        href="/login"
                        className="flex items-center justify-center px-4 py-2 h-9 text-sm font-medium text-white hover:text-gray-200 transition-colors"
                    >
                        ログイン
                    </Link>
                    <Link
                        href="/register"
                        className="flex items-center justify-center px-5 py-2 h-9 bg-gradient-to-r from-[#005B5B] to-[#1B7575] text-white text-sm font-bold rounded-xl hover:opacity-90 hover:-translate-y-0.5 active:scale-95 transition-all shadow-xs cursor-pointer"    
                    >
                        新規登録
                    </Link>
                </div>
            </div>
        </header>
    )
}