import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, Loader2, Save } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import AvatarUpload from "@/components/profile/AvatarUpload"

export default function Profile() {
    const { user, profile, signOut } = useAuth()
    const navigate = useNavigate()

    // Profile State
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

    useEffect(() => {
        if (profile) {
            setName(profile.full_name || "")
            setAvatarUrl(profile.avatar_url)
        }
    }, [profile])

    const handleSignOut = async () => {
        await signOut()
        navigate("/login")
    }

    const handleUpdateProfile = async () => {
        if (!user) return
        setLoading(true)
        try {
            const { error } = await supabase.from("profiles").update({
                id: user.id,
                full_name: name,
            }).eq("id", user.id)

            if (error) throw error
            alert("Perfil atualizado!")
        } catch (error) {
            console.error("Error updating profile:", error)
            alert("Erro ao atualizar perfil.")
        } finally {
            setLoading(false)
        }
    }




    return (
        <div className="p-4 flex flex-col items-center gap-6 max-w-md mx-auto pb-24">
            <h1 className="text-2xl font-bold self-start">Meu Perfil</h1>

            {/* Avatar Section */}
            {user && (
                <AvatarUpload
                    userId={user.id}
                    currentAvatarUrl={avatarUrl}
                    onAvatarUpdate={setAvatarUrl}
                    nameFallback={name}
                />
            )}

            {/* Profile Info Form */}
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Seu nome"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Função</Label>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-sm font-medium capitalize">
                                {profile?.role || "Membro"}
                            </span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleSignOut}>
                        <LogOut className="w-4 h-4 mr-2" /> Sair
                    </Button>
                    <Button onClick={handleUpdateProfile} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Save className="w-4 h-4 mr-2" /> Salvar
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

