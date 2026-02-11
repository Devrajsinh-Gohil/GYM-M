"use client";

import { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useAuth } from "@/context/AuthContext";
import { processAttendance, AttendanceResult } from "@/lib/attendance";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ScanPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [result, setResult] = useState<AttendanceResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState("");
    const [debugInfo, setDebugInfo] = useState<string[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);

    useEffect(() => {
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const vDevices = devices.filter(d => d.kind === 'videoinput');
                setVideoDevices(vDevices);
                setDebugInfo(prev => [...prev, `Found ${vDevices.length} video devices`]);
            } catch (err: any) {
                setDebugInfo(prev => [...prev, `Enum Error: ${err.message}`]);
            }
        };
        getDevices();
    }, []);

    // ... (rest of code)

    // RENDER ERROR IF PRESENT
    if (error && !result) {
        return (
            <div className="flex flex-col min-h-screen bg-black text-white items-center justify-center p-4 text-center">
                <XCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Camera Error</h2>
                <p className="text-gray-400 mb-6">{error}</p>
                <p className="text-sm text-gray-500 mb-8">
                    Please check: <br />
                    1. You gave camera permission.<br />
                    2. You are using HTTPS (if on mobile).
                </p>
                <button
                    onClick={() => { setError(""); window.location.reload(); }}
                    className="px-6 py-2 bg-white text-black rounded-full font-bold"
                >
                    Retry
                </button>
                <Link href="/dashboard" className="mt-4 text-gray-400 text-sm underline">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

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
                        {!selectedDeviceId ? (
                            <div className="w-full max-w-sm space-y-4">
                                <h2 className="text-xl font-bold text-center mb-4">Select Camera</h2>
                                {videoDevices.length > 0 ? (
                                    videoDevices.map((device, idx) => (
                                        <button
                                            key={device.deviceId}
                                            onClick={() => setSelectedDeviceId(device.deviceId)}
                                            className="w-full p-4 bg-gray-800 rounded-lg text-left hover:bg-gray-700 transition flex flex-col"
                                        >
                                            <span className="font-bold text-white">{device.label || `Camera ${idx + 1}`}</span>
                                            <span className="text-xs text-gray-500">{device.deviceId.slice(0, 8)}...</span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-center text-gray-500">Loading cameras...</p>
                                )}
                                <div className="mt-8 p-4 bg-gray-900 rounded-lg text-xs font-mono text-gray-400">
                                    <p className="font-bold text-gray-200 mb-2">Debug Log:</p>
                                    {debugInfo.map((info, i) => <p key={i}>{info}</p>)}
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-sm flex flex-col items-center">
                                <div className="w-full aspect-square relative overflow-hidden rounded-2xl border-2 border-white/20 mb-4">
                                    <Scanner
                                        onScan={handleScan}
                                        onError={(err: any) => {
                                            console.error(err);
                                            setError(err?.message || "Camera access failed.");
                                            setDebugInfo(prev => [...prev, `Scan Error: ${err?.message}`]);
                                        }}
                                        constraints={{ deviceId: selectedDeviceId }}
                                        formats={['qr_code']}
                                        components={{ onOff: true, torch: true }}
                                    />
                                    <div className="absolute inset-0 border-[30px] border-black/50 pointer-events-none"></div>
                                </div>
                                <button
                                    onClick={() => setSelectedDeviceId("")}
                                    className="px-6 py-2 bg-gray-800 rounded-full text-sm font-medium"
                                >
                                    Switch Camera
                                </button>
                                {error && (
                                    <div className="mt-4 p-2 bg-red-900/50 rounded text-xs text-red-200 w-full">
                                        {error}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
