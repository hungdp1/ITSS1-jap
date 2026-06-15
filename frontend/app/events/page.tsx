import { Suspense } from "react";
import EventsClient from "@/app/events/EventsClient";

function EventsLoading() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-[#F3EFE4]">
            <div className="h-10 w-10 rounded-full border-2 border-[#005B5B] border-t-transparent animate-spin" />
        </div>
    );
}

export default function EventsPage() {
    return (
        <Suspense fallback={<EventsLoading />}>
            <EventsClient />
        </Suspense>
    );
}

