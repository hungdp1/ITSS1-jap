import Link from "next/link";
import Image from "next/image";

export default function HeroSection() {
    return (
        <section className="w-full mx-auto justify-center">
            <div className="relative w-full min-h-125 md:h-130 rounded-3xl overflow-hidden flex items-center shadow-lg py-[65.5px]">
                <div className="absolute inset-0 z-0 bg-footer">
                    <Image src="/assets/images/home/hero-bg.png?v=5" alt="日本の風景" fill className="w-full object-cover object-center" priority />
                    <div className="absolute inset-0 bg-linear-to-r from-[#1B7575]/90 via-[#1B7575]/40 to-[#1B7575]/0"></div>
                </div>
                <div className="relative z-10 p-8 md:p-16 flex flex-col items-start max-w-2xl">
                    <div className="bg-[#923118] text-white text-[10px] font-medium px-3 py-1 rounded-full mb-6 tracking-[1px]">
                        新しい文化交流のカタチ
                    </div>
                    <h1 className="text-5xl md:text-7xl font-medium text-white mb-6">
                        日本と世界を、<br />声でつなぐ
                    </h1>
                    <p className="text-[#A0F0F0]/80 text-[16px] md:text-[20px] font-medium mb-6 leading-7">
                        言語の壁を越え、文化の架け橋となる。ベトナムと日本の新しい出会いが、ここから始まります。
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto">
                        <Link
                            href="/register"
                            className="flex items-center justify-center px-8 pt-[16.5px] pb-[17.5px] bg-gradient-to-r from-[#005B5B] to-[#1B7575] text-white text-[16px] font-bold rounded-xl hover:opacity-95 hover:-translate-y-0.5 active:scale-95 transition-all shadow-[0_8px_20px_-4px_rgba(0,91,91,0.25)] cursor-pointer"
                        >
                            今すぐ始める
                        </Link>
                        <Link
                            href="#latest-events"
                            className="flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur border border-white/20 text-white text-[16px] font-bold rounded-xl hover:bg-white/20 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                        >
                            詳しく見る
                        </Link>
                    </div>
                </div>
            </div>

        </section>
    )
}
