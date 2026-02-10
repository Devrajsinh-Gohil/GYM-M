"use client";

import { seedGyms } from "@/lib/seed";
import { useState } from "react";

export default function SeedButton() {
    const [seeded, setSeeded] = useState(false);

    const handleSeed = async () => {
        await seedGyms();
        setSeeded(true);
        alert("Gyms Seeded!");
    };

    if (seeded) return null;

    return (
        <button
            onClick={handleSeed}
            className="fixed bottom-4 right-4 px-4 py-2 bg-slate-800 text-white text-xs rounded opacity-50 hover:opacity-100"
        >
            Seed Gyms (Dev)
        </button>
    );
}
