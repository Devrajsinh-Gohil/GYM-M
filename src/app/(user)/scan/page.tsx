"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useAuth } from "@/context/AuthContext";
import { processAttendance, AttendanceResult } from "@/lib/attendance";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, ArrowLeft, Camera, Sparkles } from "lucide-react";
import Link from "next/link";

// Cookie helpers since we don't need a heavy library for this
function setCookie(name: string, value: string, days: number) {
    if (typeof document === 'undefined') return;
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name: string) {
    if (typeof document === 'undefined') return null;
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (typeof c === 'string' && c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

export default function ScanPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [result, setResult] = useState<AttendanceResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState("");
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(undefined);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

    const startCamera = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const vDevices = devices.filter(d => d.kind === 'videoinput');
            setVideoDevices(vDevices);

            if (vDevices.length > 0) {
                const savedId = getCookie("gym-platform-camera-id");
                if (savedId && vDevices.find(d => d.deviceId === savedId)) {
                    setActiveDeviceId(savedId);
                } else {
                    // Prefer back camera (environment-facing) for QR scanning
                    const backCamera = vDevices.find(d =>
                        d.label.toLowerCase().includes('back') ||
                        d.label.toLowerCase().includes('rear') ||
                        d.label.toLowerCase().includes('environment')
                    );

                    if (backCamera) {
                        setActiveDeviceId(backCamera.deviceId);
                    } else {
                        // Fallback: use last camera (usually back camera on mobile)
                        setActiveDeviceId(vDevices[vDevices.length - 1].deviceId);
                    }
                }
            }
            setIsCameraActive(true);
        } catch (err: any) {
            console.error("Error enumerating devices:", err);
            setIsCameraActive(true);
        }
    };

    const handleScan = async (detectedCodes: any[]) => {
        if (isProcessing || !user || result) return;

        const code = detectedCodes[0]?.rawValue;
        if (!code) return;

        setIsProcessing(true);

        try {
            let gymId = code;
            try {
                const data = JSON.parse(code);
                if (data.gymId) gymId = data.gymId;
            } catch (e) {
                // Not JSON, treat as raw ID
            }

            const response = await processAttendance(user.uid, gymId);
            setResult(response);
        } catch (err) {
            console.error(err);
            setError("Invalid QR Code");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            {/* Header */}
            <div className="p-5 flex items-center justify-between backdrop-blur-sm bg-white/5">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold">QR Scanner</h1>
                        <p className="text-xs text-gray-400">Check in/out instantly</p>
                    </div>
                </div>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
                {result ? (
                    // Result View
                    <div className="text-center space-y-6 fade-in">
                        <div className={`w-28 h-28 mx-auto rounded-full flex items-center justify-center ${result.success ? 'bg-emerald-500/20' : 'bg-red-500/20'
                            }`}>
                            {result.success ? (
                                <CheckCircle className="w-16 h-16 text-emerald-400" />
                            ) : (
                                <XCircle className="w-16 h-16 text-red-400" />
                            )}
                        </div>

                        <div>
                            <h2 className="text-3xl font-bold mb-2">
                                {result.type === 'CHECK_IN' ? 'Checked In!' : 'Checked Out!'}
                            </h2>
                            <p className="text-gray-400 text-lg">{result.message}</p>
                        </div>

                        <button
                            onClick={() => router.push('/dashboard')}
                            className="mt-8 px-10 py-4 bg-white text-gray-900 font-bold rounded-2xl hover:bg-gray-100 transition-all hover-lift shadow-xl"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                ) : (
                    <>
                        {!isCameraActive ? (
                            <div className="text-center max-w-sm fade-in">
                                <div className="w-32 h-32 bg-gradient-to-br from-emerald-500/20 to-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 relative">
                                    <div className="absolute inset-0 bg-emerald-500/10 rounded-3xl animate-pulse"></div>
                                    <Camera className="w-16 h-16 text-emerald-400 relative z-10" />
                                </div>

                                <h2 className="text-2xl font-bold mb-3">Ready to Scan?</h2>
                                <p className="text-gray-400 mb-10 leading-relaxed">
                                    Point your camera at the gym's QR code to check in or out instantly.
                                </p>

                                <button
                                    onClick={startCamera}
                                    className="w-full px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all hover-lift shadow-xl"
                                >
                                    Open Camera
                                </button>

                                {error && (
                                    <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <p className="text-red-400 text-sm">{error}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Scanner View
                            <div className="w-full max-w-md flex flex-col items-center fade-in">
                                <div className="w-full aspect-square relative overflow-hidden rounded-3xl border-4 border-white/10 mb-6 shadow-2xl">
                                    <Scanner
                                        onScan={handleScan}
                                        onError={(err: any) => {
                                            console.error(err);
                                        }}
                                        constraints={{
                                            deviceId: activeDeviceId,
                                            aspectRatio: 1,
                                        }}
                                        formats={['qr_code']}
                                        components={{ onOff: true, torch: true }}
                                    />

                                    {/* Scanning Frame Overlay */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {/* Dark overlay with cutout */}
                                        <div className="absolute inset-0 border-[40px] border-black/60"></div>

                                        {/* Animated scanning frame */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-56 h-56 border-4 border-emerald-400 rounded-2xl relative">
                                                {/* Corner accents */}
                                                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl"></div>
                                                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl"></div>
                                                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl"></div>
                                                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl"></div>

                                                {/* Scanning line animation */}
                                                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-400 animate-pulse"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-400 text-center mb-6 px-4">
                                    Position the QR code within the frame
                                </p>

                                <div className="flex gap-3 w-full">
                                    {videoDevices.length > 1 && (
                                        <button
                                            onClick={() => {
                                                const currentIndex = videoDevices.findIndex(d => d.deviceId === activeDeviceId);
                                                const nextIndex = (currentIndex + 1) % videoDevices.length;
                                                const nextDeviceId = videoDevices[nextIndex].deviceId;
                                                setActiveDeviceId(nextDeviceId);
                                                setCookie("gym-platform-camera-id", nextDeviceId, 365);
                                            }}
                                            className="flex-1 px-5 py-3 bg-white/10 backdrop-blur-sm rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
                                        >
                                            <Camera className="w-4 h-4" />
                                            Switch ({videoDevices.findIndex(d => d.deviceId === activeDeviceId) + 1}/{videoDevices.length})
                                        </button>
                                    )}

                                    <button
                                        onClick={() => { setIsCameraActive(false); setError(""); }}
                                        className="flex-1 px-5 py-3 bg-white/5 backdrop-blur-sm rounded-xl text-sm font-semibold text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
