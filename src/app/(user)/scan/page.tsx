"use client";

import { useState } from "react";
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
            <div className="p-4 flex items-center">
                <Link href="/dashboard" className="p-2 bg-white/10 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <h1 className="ml-4 text-lg font-bold">Scan Gym QR</h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4">
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
            </div>
        </div>
    );
}
