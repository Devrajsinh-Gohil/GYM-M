"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth } from "@/context/AuthContext";
import { processAttendance, AttendanceResult } from "@/lib/attendance";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, ArrowLeft, Camera, Sparkles } from "lucide-react";
import Link from "next/link";
import { isRunningInWebView } from "@/lib/utils";

export default function ScanPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [result, setResult] = useState<AttendanceResult | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState("");
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [cameraId, setCameraId] = useState<string | null>(null);
    const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
    const [isWebView] = useState(isRunningInWebView());

    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerDivId = "qr-reader";

    // Cleanup scanner on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    // Listen for messages from React Native WebView
    useEffect(() => {
        if (!isWebView) return;

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'QR_SCANNED') {
                handleQRCode(event.data.data);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [isWebView, user, result, isProcessing]);

    // Handle QR code from either web or native scanner
    const handleQRCode = async (decodedText: string) => {
        if (isProcessing || !user || result) return;

        setIsProcessing(true);

        try {
            let gymId = decodedText;
            try {
                const data = JSON.parse(decodedText);
                if (data.gymId) gymId = data.gymId;
            } catch (e) {
                // Not JSON, treat as raw ID
            }

            const response = await processAttendance(user.uid, gymId);
            setResult(response);

            // Stop web scanner if active
            if (scannerRef.current?.isScanning) {
                await scannerRef.current.stop();
            }
        } catch (err) {
            console.error(err);
            setError("Invalid QR Code");
        } finally {
            setIsProcessing(false);
        }
    };

    // Request native scanner from React Native
    const openNativeScanner = () => {
        if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
            (window as any).ReactNativeWebView.postMessage(JSON.stringify({
                type: 'OPEN_NATIVE_SCANNER'
            }));
        }
    };

    const startCamera = async () => {
        setIsLoading(true);
        setError("");
        setIsCameraActive(true); // Set this first to render the DOM element

        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // Initialize scanner only after DOM element exists
            if (!scannerRef.current) {
                const element = document.getElementById(scannerDivId);
                if (!element) {
                    throw new Error("Scanner element not found in DOM");
                }
                scannerRef.current = new Html5Qrcode(scannerDivId);
            }

            // Check for saved camera preference
            const savedCameraId = localStorage.getItem("gym-platform-camera-id");

            // Configure camera constraints
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            // Success callback
            const onScanSuccess = async (decodedText: string) => {
                if (isProcessing || !user || result) return;

                setIsProcessing(true);

                try {
                    let gymId = decodedText;
                    try {
                        const data = JSON.parse(decodedText);
                        if (data.gymId) gymId = data.gymId;
                    } catch (e) {
                        // Not JSON, treat as raw ID
                    }

                    const response = await processAttendance(user.uid, gymId);
                    setResult(response);

                    // Stop scanner after successful scan
                    if (scannerRef.current?.isScanning) {
                        await scannerRef.current.stop();
                    }
                } catch (err) {
                    console.error(err);
                    setError("Invalid QR Code");
                } finally {
                    setIsProcessing(false);
                }
            };

            // Error callback (silent, as errors are common during scanning)
            const onScanError = () => {
                // Silently ignore scan errors - they happen frequently during normal scanning
            };

            // Try to start with saved camera or rear camera preference
            if (savedCameraId) {
                try {
                    await scannerRef.current.start(
                        savedCameraId,
                        config,
                        onScanSuccess,
                        onScanError
                    );
                    setCameraId(savedCameraId);
                    setIsLoading(false);
                    return;
                } catch (err) {
                    console.log("Saved camera not available, falling back to default");
                }
            }

            // Fallback: Use facingMode to automatically select rear camera
            try {
                await scannerRef.current.start(
                    { facingMode: "environment" }, // Prefer rear camera
                    config,
                    onScanSuccess,
                    onScanError
                );

                // Get the actual camera ID being used
                const cameras = await Html5Qrcode.getCameras();
                if (cameras.length > 0) {
                    // Try to identify which camera is active
                    const activeCamera = cameras[cameras.length - 1]; // Usually rear camera
                    setCameraId(activeCamera.id);
                    localStorage.setItem("gym-platform-camera-id", activeCamera.id);
                }
            } catch (err: any) {
                console.error("Error starting camera:", err);
                setIsCameraActive(false); // Reset camera state on error
                setError(
                    err.message?.includes("Permission") || err.message?.includes("NotAllowedError")
                        ? "Camera permission denied. Please allow camera access."
                        : err.message?.includes("NotFoundError")
                            ? "No camera found on this device."
                            : "Unable to access camera. Please check your device settings."
                );
            }
        } catch (err: any) {
            console.error("Error initializing scanner:", err);
            setIsCameraActive(false); // Reset camera state on error
            setError("Failed to initialize scanner. Please refresh the page.");
        } finally {
            setIsLoading(false);
        }
    };

    const switchCamera = async () => {
        if (!scannerRef.current) return;

        try {
            setIsLoading(true);

            // Get available cameras
            const cameras = await Html5Qrcode.getCameras();
            setAvailableCameras(cameras.map(c => ({ id: c.id, label: c.label })));

            if (cameras.length <= 1) {
                setError("No other cameras available");
                setIsLoading(false);
                return;
            }

            // Stop current scanner
            if (scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }

            // Find next camera
            const currentIndex = cameras.findIndex(c => c.id === cameraId);
            const nextIndex = (currentIndex + 1) % cameras.length;
            const nextCamera = cameras[nextIndex];

            // Start with next camera
            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            };

            const onScanSuccess = async (decodedText: string) => {
                if (isProcessing || !user || result) return;

                setIsProcessing(true);

                try {
                    let gymId = decodedText;
                    try {
                        const data = JSON.parse(decodedText);
                        if (data.gymId) gymId = data.gymId;
                    } catch (e) {
                        // Not JSON, treat as raw ID
                    }

                    const response = await processAttendance(user.uid, gymId);
                    setResult(response);

                    if (scannerRef.current?.isScanning) {
                        await scannerRef.current.stop();
                    }
                } catch (err) {
                    console.error(err);
                    setError("Invalid QR Code");
                } finally {
                    setIsProcessing(false);
                }
            };

            const onScanError = () => {
                // Silently ignore
            };

            await scannerRef.current.start(
                nextCamera.id,
                config,
                onScanSuccess,
                onScanError
            );

            setCameraId(nextCamera.id);
            localStorage.setItem("gym-platform-camera-id", nextCamera.id);
            setError("");
        } catch (err: any) {
            console.error("Error switching camera:", err);
            setError("Failed to switch camera");
        } finally {
            setIsLoading(false);
        }
    };

    const stopCamera = async () => {
        if (scannerRef.current?.isScanning) {
            try {
                await scannerRef.current.stop();
            } catch (err) {
                console.error("Error stopping camera:", err);
            }
        }
        setIsCameraActive(false);
        setError("");
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
                                    onClick={isWebView ? openNativeScanner : startCamera}
                                    disabled={isLoading}
                                    className="w-full px-8 py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-500 transition-all hover-lift shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? "Starting Camera..." : "Open Camera"}
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
                                <div className="w-full aspect-square relative overflow-hidden rounded-3xl border-4 border-white/10 mb-6 shadow-2xl bg-black">
                                    {/* Scanner container */}
                                    <div id={scannerDivId} className="w-full h-full"></div>

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

                                    {/* Loading overlay */}
                                    {isLoading && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <div className="text-white text-sm">Loading...</div>
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-gray-400 text-center mb-6 px-4">
                                    Position the QR code within the frame
                                </p>

                                <div className="flex gap-3 w-full">
                                    <button
                                        onClick={switchCamera}
                                        disabled={isLoading}
                                        className="flex-1 px-5 py-3 bg-white/10 backdrop-blur-sm rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Camera className="w-4 h-4" />
                                        Switch Camera
                                    </button>

                                    <button
                                        onClick={stopCamera}
                                        disabled={isLoading}
                                        className="flex-1 px-5 py-3 bg-white/5 backdrop-blur-sm rounded-xl text-sm font-semibold text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                {error && (
                                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl w-full">
                                        <p className="text-red-400 text-sm text-center">{error}</p>
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
