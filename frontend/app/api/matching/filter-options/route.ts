import { NextResponse } from "next/server";
import { localApiResponse } from "@/lib/api";

export async function GET() {
    try {
        const res = await localApiResponse("GET", "/matchings/filter-options");
        const data = await res.json();
        if (!res.ok) {
            return NextResponse.json(
                { purposes: [], hobbies: [], error: data.error || "Failed to load filter options" },
                { status: res.status }
            );
        }
        return NextResponse.json(
            { purposes: data.purposes ?? [], hobbies: data.hobbies ?? [] },
            { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load filter options";
        return NextResponse.json({ purposes: [], hobbies: [], error: message }, { status: 500 });
    }
}
