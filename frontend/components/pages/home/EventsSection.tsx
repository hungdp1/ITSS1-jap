import Link from "next/link";
import Image from "next/image";
import { fetchPublicEventsList } from "@/lib/events-server";
import { formatApiEvent, formatEventDate, type ApiEvent } from "@/lib/events-format";

const HOME_EVENTS_LIMIT = 4;

export default async function EventsSection() {
    const result = await fetchPublicEventsList({ page: 1, limit: HOME_EVENTS_LIMIT });
    const events = (result.data as ApiEvent[]).map((event) => formatApiEvent(event));

    return (
        <section id="latest-events" className="w-full max-w-296 mx-auto flex scroll-mt-24 flex-col items-start pt-4 gap-8">
            <div className="w-full flex flex-row justify-between items-end">
                <div className="flex flex-col items-start gap-2">
                    <div className="flex flex-row items-center gap-2">
                        <div className="text-[#923118] w-4.5 h-5 flex items-center justify-center">
                            <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.5 16C10.8 16 10.2083 15.7583 9.725 15.275C9.24167 14.7917 9 14.2 9 13.5C9 12.8 9.24167 12.2083 9.725 11.725C10.2083 11.2417 10.8 11 11.5 11C12.2 11 12.7917 11.2417 13.275 11.725C13.7583 12.2083 14 12.8 14 13.5C14 14.2 13.7583 14.7917 13.275 15.275C12.7917 15.7583 12.2 16 11.5 16ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18V4C0 3.45 0.195833 2.97917 0.5875 2.5875C0.979167 2.19583 1.45 2 2 2H3V0H5V2H13V0H15V2H16C16.55 2 17.0208 2.19583 17.4125 2.5875C17.8042 2.97917 18 3.45 18 4V18C18 18.55 17.8042 19.0208 17.4125 19.4125C17.0208 19.8042 16.55 20 16 20H2ZM2 18H16V8H2V18ZM2 6H16V4H2V6ZM2 6V4V6Z" fill="#923118" />
                            </svg>
                        </div>
                        <span className="text-[12px] font-medium text-[#923118] leading-4 tracking-[1.2px] uppercase">
                            イベント
                        </span>
                    </div>
                    <h2 className="text-[30px] font-medium text-text-main leading-9">
                        最新の公式イベント
                    </h2>
                </div>
                <Link href="/events" className="flex flex-row items-center gap-1 group pb-1">
                    <span className="text-[14px] font-medium text-[#1B7575] leading-5 group-hover:underline">
                        すべてのイベントを見る
                    </span>
                    <div className="text-[#1B7575] w-3.5 h-3.5 flex items-center justify-center transition-transform group-hover:translate-x-1">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7.10208 5.25H0V4.08333H7.10208L3.83542 0.816667L4.66667 0L9.33333 4.66667L4.66667 9.33333L3.83542 8.51667L7.10208 5.25Z" fill="#1B7575" />
                        </svg>
                    </div>
                </Link>
            </div>

            {events.length > 0 ? (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {events.map((event) => (
                        <Link
                            key={event.id}
                            href="/events"
                            className="w-full max-w-69 mx-auto h-81.5 bg-white border border-[#DFE3E1]/40 shadow-[0_2px_12px_rgba(0,0,0,0.01)] rounded-2xl flex flex-col overflow-hidden hover:shadow-[0_20px_40px_rgba(0,91,91,0.06)] hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                        >
                            <div className="relative w-full h-48 bg-gray-200">
                                <Image
                                    src={event.imageUrl ?? "/assets/images/events/event-1.png"}
                                    alt={event.title}
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            <div className="flex flex-col items-start p-5 gap-2 h-33">
                                <div
                                    className="text-[12px] font-bold text-[#1B7575] leading-4"
                                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                                >
                                    {formatEventDate(event.eventTime)}
                                </div>
                                <h3 className="text-[18px] font-medium text-text-main leading-7 truncate w-full">
                                    {event.title}
                                </h3>
                                <p className="text-[12px] font-medium text-text-muted leading-4 line-clamp-2">
                                    {event.description}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <p className="text-[14px] font-medium text-text-muted leading-5">
                    現在開催予定のイベントはありません。
                </p>
            )}
        </section>
    );
}
