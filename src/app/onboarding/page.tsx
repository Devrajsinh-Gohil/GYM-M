"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, setDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Gym {
    id: string;
    name: string;
}

export default function OnboardingPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [gyms, setGyms] = useState<Gym[]>([]);
    const [selectedGym, setSelectedGym] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("male");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchGyms = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "gyms"));
                const gymsList = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    name: doc.data().name as string,
                }));
                setGyms(gymsList);
            } catch (err) {
                console.error("Error fetching gyms:", err);
                setError("Failed to load gyms. Please refresh.");
            }
        };

        fetchGyms();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;
        if (!selectedGym) {
            setError("Please select a gym.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await updateDoc(doc(db, "users", user.uid), {
                status: "PENDING",
                gymId: selectedGym,
                phoneNumber,
                age: Number.parseInt(age),
                gender,
                updatedAt: serverTimestamp(),
            });

            router.push("/pending");
        } catch (err) {
            console.error(err);
            setError("Failed to complete onboarding. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
            <div className="w-full max-w-md space-y-6 bg-card p-6 rounded-xl border border-border bg-amber-20">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-primary">Complete Your Profile</h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        Just a few more details to get you started.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Your Gym</label>
                        <select
                            value={selectedGym}
                            onChange={(e) => setSelectedGym(e.target.value)}
                            className="w-full p-2 rounded-md border border-input bg-background"
                            required
                        >
                            <option value="">-- Choose a Gym --</option>
                            {gyms.map((gym) => (
                                <option key={gym.id} value={gym.id}>
                                    {gym.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Phone Number</label>
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="w-full p-2 rounded-md border border-input bg-background"
                            placeholder="+1234567890"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Age</label>
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                className="w-full p-2 rounded-md border border-input bg-background"
                                placeholder="25"
                                min="16"
                                max="99"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Gender</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="w-full p-2 rounded-md border border-input bg-background"
                            >
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-destructive text-center font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={cn(
                            "w-full py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90 transition",
                            loading && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        {loading ? "Saving..." : "Complete Setup"}
                    </button>
                </form>
            </div>
        </div>
    );
}
