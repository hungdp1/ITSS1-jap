import type { ProfileLanguage } from "@/app/actions/profile";

export const NATIONALITY_OPTIONS = ["日本", "ベトナム"] as const;
export type Nationality = (typeof NATIONALITY_OPTIONS)[number];

export const JLPT_LEVEL_OPTIONS = ["N1", "N2", "N3", "N4", "N5"] as const;

export type ProfileLanguageEdit = {
    nationality: Nationality;
    jlptLevel: string | null;
};

function isNationalityName(name: string): name is Nationality {
    return name === "日本" || name === "ベトナム";
}

/** Map API profile languages → edit form (handles legacy rows without type). */
export function languagesFromProfile(
    languages: ProfileLanguage[]
): ProfileLanguageEdit {
    if (languages.length === 0) {
        return { nationality: "日本", jlptLevel: null };
    }

    const nativeEntry = languages.find(
        (l) => l.levelType === "native" || l.type === "native"
    );
    const jlptEntry = languages.find(
        (l) =>
            l.name === "日本" &&
            (l.levelType === "learning" || l.type === "learning" || l.jlptLevel || l.level)
    );

    let nationality: Nationality = "日本";
    const nativeName = nativeEntry?.name ?? languages[0]?.name;
    if (nativeName && isNationalityName(nativeName)) {
        nationality = nativeName;
    } else if (languages.some((l) => l.name === "ベトナム")) {
        nationality = "ベトナム";
    }

    const jlptLevel = jlptEntry?.jlptLevel ?? jlptEntry?.level ?? null;

    return { nationality, jlptLevel };
}

/** Build API payload for PUT /profiles/languages. */
export function profileLanguagesToPayload(edit: ProfileLanguageEdit): {
    language: string;
    type: string;
    level: string | null;
}[] {
    const learningLanguage = edit.nationality === "日本" ? "ベトナム" : "日本";

    if (edit.nationality === "ベトナム") {
        return [
            { language: "ベトナム", type: "native", level: null },
            { language: "日本", type: "learning", level: edit.jlptLevel },
        ];
    }

    return [
        { language: "日本", type: "native", level: null },
        { language: learningLanguage, type: "learning", level: null },
    ];
}
