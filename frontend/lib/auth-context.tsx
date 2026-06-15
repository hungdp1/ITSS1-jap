"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

export type AuthUser = {
    id: number;
    email?: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
};

type AuthContextValue = {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

let cachedUser: AuthUser | null | undefined;
let inflight: Promise<AuthUser | null> | null = null;

async function fetchAuthUser(): Promise<AuthUser | null> {
    if (cachedUser !== undefined) return cachedUser;
    if (inflight) return inflight;

    inflight = fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
            const user = data.user ?? null;
            cachedUser = user;
            return user;
        })
        .catch(() => {
            cachedUser = null;
            return null;
        })
        .finally(() => {
            inflight = null;
        });

    return inflight;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(
        cachedUser !== undefined ? cachedUser : null
    );
    const [isLoading, setIsLoading] = useState(cachedUser === undefined);

    const refresh = useCallback(async () => {
        cachedUser = undefined;
        setIsLoading(true);
        const next = await fetchAuthUser();
        setUser(next);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (cachedUser !== undefined) {
            setUser(cachedUser);
            setIsLoading(false);
            return;
        }
        fetchAuthUser().then((next) => {
            setUser(next);
            setIsLoading(false);
        });
    }, []);

    const value = useMemo(
        () => ({
            user,
            isLoading,
            isAuthenticated: Boolean(user?.id),
            refresh,
        }),
        [user, isLoading, refresh]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return ctx;
}

export function useAuthOptional() {
    return useContext(AuthContext);
}
