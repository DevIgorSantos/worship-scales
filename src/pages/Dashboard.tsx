import { VerseOfTheDay } from "@/components/dashboard/VerseOfTheDay"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { NextServiceCard } from "@/components/dashboard/NextServiceCard"

export default function Dashboard() {
    return (
        <div className="p-4 pb-24 space-y-6 animate-in fade-in duration-500">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary to-purple-400 w-fit">
                Dashboard
            </h1>

            <VerseOfTheDay />

            <StatsCards />

            <div className="grid md:grid-cols-2 gap-6">
                <NextServiceCard />

                {/* Placeholder for future features or quick actions */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Acesso Rápido</h3>

                    {/* Add quick links if needed, otherwise this column can be used for "Recent Activity" later */}
                    <div className="grid gap-2">
                        {/* Example Placeholder */}
                    </div>
                </div>
            </div>
        </div>
    )
}
