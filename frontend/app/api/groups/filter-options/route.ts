import { NextResponse } from "next/server";
import { getApiBaseUrl } from "@/lib/env";
import { GROUP_LANGUAGE_LEVEL_OPTIONS, sortJlptLevels } from "@/lib/groupFilters";

export async function GET() {
    try {
        const res = await fetch(`${getApiBaseUrl()}/groups/filter-options`, {
            next: { revalidate: 300 },
        });
        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                {
                    hobbyTags: [],
                    languageTags: [...GROUP_LANGUAGE_LEVEL_OPTIONS],
                    error: data.error || "Failed to load filter options",
                },
                { status: res.status }
            );
        }

        return NextResponse.json(
            {
                hobbyTags: data.hobbyTags ?? [],
                languageTags: sortJlptLevels([
                    ...GROUP_LANGUAGE_LEVEL_OPTIONS,
                    ...(data.languageTags ?? []),
                ]),
            },
            {
                headers: {
                    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
                },
            }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to load filter options";
        return NextResponse.json(
            { hobbyTags: [], languageTags: [...GROUP_LANGUAGE_LEVEL_OPTIONS], error: message },
            { status: 500 }
        );
    }
}
