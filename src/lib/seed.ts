import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";

export const seedGyms = async () => {
    const gyms = [
        { name: "Iron Fitness Main", location: "Downtown", active: true },
        { name: "City Gym Central", location: "Central Park", active: true },
        { name: "Powerhouse Gym", location: "Westside", active: true },
    ];

    const gymsRef = collection(db, "gyms");

    try {
        // Check if gyms already exist to avoid duplicates
        const snapshot = await getDocs(gymsRef);
        if (!snapshot.empty) {
            console.log("Gyms already seeded. Skipping.");
            return;
        }

        for (const gym of gyms) {
            await addDoc(gymsRef, gym);
            console.log(`Seeded gym: ${gym.name}`);
        }
        console.log("Seeding complete!");
    } catch (error) {
        console.error("Error seeding gyms:", error);
    }
};
