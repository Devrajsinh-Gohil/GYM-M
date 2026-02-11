"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useAuth } from "@/context/AuthContext";
import { processAttendance, AttendanceResult } from "@/lib/attendance";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, ArrowLeft, Camera } from "lucide-react";
import Link from "next/link";

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
                const savedId = localStorage.getItem("gym-platform-camera-id");
                if (savedId && vDevices.find(d => d.deviceId === savedId)) {
                    setActiveDeviceId(savedId);
                } else {
                    // Default to first camera (Camera 0)
                    setActiveDeviceId(vDevices[0].deviceId);
                }
            }
            setIsCameraActive(true);
        } catch (err: any) {
            console.error("Error enumerating devices:", err);
            // Fallback to letting the scanner decide or use environment facing mode
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

    // RENDER ERROR IF PRESENT (Fatal errors that block the UI)
    if (error && !result && !isCameraActive) {
        // Only show fatal errors here if camera failed to start or permission denied
        // scanning errors are handled in the scanner view
    }

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            {/* Header */}
            <div className="p-4 flex items-center justify-between">
                <div className="flex items-center">
                    <Link href="/dashboard" className="p-2 bg-white/10 rounded-full">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="ml-4 text-lg font-bold">Scan Gym QR</h1>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
                {result ? (
                    // Result View
                    <div className="text-center space-y-4 animate-in fade-in zoom-in">
                        {result.success ? (
                            <CheckCircle className="w-24 h-24 text-emerald-500 mx-auto" />
                        ) : (
                            <XCircle className="w-24 h-24 text-red-500 mx-auto" />
                        )}
                        <h2 className="text-2xl font-bold">{result.type === 'CHECK_IN' ? 'Checked In!' : 'Checked Out!'}</h2>
                        <p className="text-gray-400">{result.message}</p>

                        <button
                            onClick={() => router.push('/dashboard')}
                            className="mt-8 px-8 py-3 bg-white text-black font-bold rounded-full"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                ) : (
                    <>
                        {!isCameraActive ? (
                            <div className="text-center">
                                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Camera className="w-10 h-10 text-gray-400" />
                                </div>
                                <h2 className="text-xl font-bold mb-2">Ready to Scan?</h2>
                                <p className="text-gray-400 mb-8 max-w-xs mx-auto">
                                    Click below to open the camera and scan the gym's QR code.
                                </p>
                                <button
                                    onClick={startCamera}
                                    className="px-8 py-3 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition"
                                >
                                    Open Camera
                                </button>
                                {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
                            </div>
                        ) : (
                            // Scanner View
                            <div className="w-full max-w-sm flex flex-col items-center">
                                <div className="w-full aspect-square relative overflow-hidden rounded-2xl border-2 border-white/20 mb-4">
                                    <Scanner
                                        onScan={handleScan}
                                        onError={(err: any) => {
                                            console.error(err);
                                            // Don't show confusing errors to user immediately, just log
                                            // setError(err?.message || "Camera error");
                                        }}
                                        // Use specific device ID if found (multicamera phones), else environment
                                        constraints={{
                                            deviceId: activeDeviceId,
                                            aspectRatio: 1, // Force square aspect ratio
                                        }}
                                        formats={['qr_code']}
                                        components={{ onOff: true, torch: true }}
                                    />
                                    <div className="absolute inset-0 border-[30px] border-black/50 pointer-events-none"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-48 h-48 border-2 border-emerald-500/50 rounded-lg animate-pulse"></div>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-400 text-center mb-4">
                                    Align the code within the frame
                                </p>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => {
                                            // Cycle to next camera
                                            if (videoDevices.length > 1) {
                                                const currentIndex = videoDevices.findIndex(d => d.deviceId === activeDeviceId);
                                                const nextIndex = (currentIndex + 1) % videoDevices.length;
                                                const nextDeviceId = videoDevices[nextIndex].deviceId;
                                                setActiveDeviceId(nextDeviceId);
                                                localStorage.setItem("gym-platform-camera-id", nextDeviceId);
                                            }
                                        }}
                                        className="px-6 py-2 bg-gray-800 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-gray-700 transition"
                                    >
                                        <Camera className="w-4 h-4" />
                                        Switch Camera ({videoDevices.findIndex(d => d.deviceId === activeDeviceId) + 1}/{videoDevices.length})
                                    </button>

                                    <button
                                        onClick={() => { setIsCameraActive(false); setError(""); }}
                                        className="px-6 py-2 bg-gray-800/50 rounded-full text-sm font-medium text-gray-400 hover:bg-gray-800 transition"
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
