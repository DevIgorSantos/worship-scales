import { Outlet, useLocation, Link } from "react-router-dom"
import { LayoutDashboard, Calendar, Music, User, UserCog } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"

export default function AppLayout() {
    const location = useLocation()
    const { isAdmin } = useAuth()

    const isActive = (path: string) => location.pathname === path

    const navItems = [
        { name: "Dashboard", path: "/", icon: LayoutDashboard },
        { name: "Escalas", path: "/escalas", icon: Calendar },
        { name: "Músicas", path: "/musicas", icon: Music },
        ...(isAdmin ? [{ name: "Gestão", path: "/gestao", icon: UserCog }] : []),
        { name: "Perfil", path: "/perfil", icon: User },
    ]

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
            <main className="flex-1 pb-20">
                <Outlet />
            </main>

            <nav className="fixed bottom-0 left-0 right-0 border-t bg-card text-card-foreground pb-safe z-50">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const active = isActive(item.path)
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors hover:bg-accent/10",
                                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Icon className={cn("w-6 h-6", active && "size-7 animate-pulse-once")} />
                                <span className="text-[10px] font-medium uppercase tracking-wide">{item.name}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
