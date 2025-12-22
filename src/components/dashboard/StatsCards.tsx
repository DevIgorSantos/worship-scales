import { useEffect, useState } from "react"
import { Music, Users, CalendarDays, Mic2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"

export function StatsCards() {
    const [stats, setStats] = useState({
        songs: 0,
        harpa: 0,
        members: 0,
        services: 0
    })

    useEffect(() => {
        const fetchStats = async () => {
            const [
                { count: songsCount },
                { count: harpaCount },
                { count: membersCount },
                { count: servicesCount }
            ] = await Promise.all([
                supabase.from("songs").select("*", { count: "exact", head: true }),
                supabase.from("songs").select("*", { count: "exact", head: true }).eq("type", "Harpa Cristã"),
                supabase.from("profiles").select("*", { count: "exact", head: true }),
                supabase.from("services").select("*", { count: "exact", head: true }).gte("date", new Date().toISOString().split('T')[0])
            ])

            setStats({
                songs: songsCount || 0,
                harpa: harpaCount || 0,
                members: membersCount || 0,
                services: servicesCount || 0
            })
        }

        fetchStats()
    }, [])

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardContent className="p-6 flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Music className="w-4 h-4" /> Total de Músicas
                    </span>
                    <span className="text-2xl font-bold">{stats.songs}</span>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6 flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Mic2 className="w-4 h-4" /> Hinos da Harpa
                    </span>
                    <span className="text-2xl font-bold">{stats.harpa}</span>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6 flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" /> Membros
                    </span>
                    <span className="text-2xl font-bold">{stats.members}</span>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6 flex flex-col gap-1">
                    <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" /> Cultos Futuros
                    </span>
                    <span className="text-2xl font-bold">{stats.services}</span>
                </CardContent>
            </Card>
        </div>
    )
}
