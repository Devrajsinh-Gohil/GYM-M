import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function isRunningInWebView(): boolean {
    if (typeof window === 'undefined') return false;

    const userAgent = window.navigator.userAgent;

    // Check for our custom WebView user agent
    return userAgent.includes('GymMemberApp');
}
