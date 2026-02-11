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

    useEffect(() => {
        const getDevices = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(d => d.kind === 'videoinput');
                setDebugInfo(prev => [...prev, `Video Devices: ${videoDevices.length}`]);
                videoDevices.forEach(d => {
                    setDebugInfo(prev => [...prev, `- ${d.label || 'Unnamed'} (${d.deviceId.slice(0, 5)}...)`]);
                });
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
                    // Scanner View
                    <div className="w-full max-w-sm aspect-square relative overflow-hidden rounded-2xl border-2 border-white/20">
                        <Scanner
                            onScan={handleScan}
                            onError={(err: any) => {
                                console.error(err);
                                const msg = err?.message || "Unknown error";
                                setError(msg);
                                setDebugInfo(prev => [...prev, `Scan Error: ${msg}`]);
                            }}
                            // constraints={{ facingMode: 'environment' }} // REMOVED FOR DEBUGGING
                            formats={['qr_code']}
                            components={{
                                onOff: true,
                                torch: true,
                            }}
                        />
                        <div className="absolute inset-0 border-[30px] border-black/50 pointer-events-none"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-48 h-48 border-2 border-emerald-500/50 rounded-lg animate-pulse"></div>
                        </div>
                    </div>
                )}

                {!result && (
                    <p className="mt-8 text-sm text-gray-500 text-center max-w-xs">
                        Align the Gym's QR code within the frame to automatically check in or out.
                    </p>
                )}

                {/* Debug Overlay */}
                <div className="mt-8 p-4 bg-gray-900 rounded-lg text-xs font-mono text-gray-400 w-full max-w-sm overflow-hidden">
                    <p className="font-bold text-gray-200 mb-2">Debug Log:</p>
                    {debugInfo.length === 0 ? <p>Initializing...</p> : debugInfo.map((info, i) => (
                        <p key={i} className="truncate">{info}</p>
                    ))}
                    <p className="mt-2 text-yellow-500">Secure Context: {typeof window !== 'undefined' && window.isSecureContext ? 'Yes' : 'No'}</p>

                    <button
                        onClick={async () => {
                            try {
                                setDebugInfo(prev => [...prev, "Requesting stream..."]);
                                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                                setDebugInfo(prev => [...prev, "Stream SUCCESS!"]);
                                setDebugInfo(prev => [...prev, `Tracks: ${stream.getVideoTracks().length}`]);
                                stream.getTracks().forEach(t => t.stop());
                                // Refresh device list now that we have permission
                                const devices = await navigator.mediaDevices.enumerateDevices();
                                devices.forEach(d => {
                                    if (d.kind === 'videoinput') setDebugInfo(prev => [...prev, `Found: ${d.label}`]);
                                });
                            } catch (err: any) {
                                setDebugInfo(prev => [...prev, `Stream FAIL: ${err.name} - ${err.message}`]);
                            }
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded w-full"
                    >
                        Test Camera Permission
                    </button>
                </div>
            </div>
        </div>
    );
}
