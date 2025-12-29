import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Save } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import AvatarUpload from "@/components/profile/AvatarUpload"

export default function SetPassword() {
    const { user, profile } = useAuth()
    const navigate = useNavigate()
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [name, setName] = useState("")

    useEffect(() => {
        const ensureProfile = async () => {
            if (user && !profile) {
                // Profile doesn't exist yet (first login via Magic Link?)
                // Try to create it from metadata
                const metadata = user.user_metadata
                if (metadata && metadata.full_name) {
                    try {
                        const { error } = await supabase.from("profiles").upsert({
                            id: user.id,
                            full_name: metadata.full_name,
                            role: metadata.role || "member",
                            assigned_instruments: []
                        })
                        if (error) {
                            console.error("Error creating initial profile:", error)
                        } else {
                            // Set local state
                            setName(metadata.full_name)
                        }
                    } catch (err) {
                        console.error("Error in ensureProfile:", err)
                    }
                }
            } else if (profile) {
                setName(profile.full_name || "")
                setAvatarUrl(profile.avatar_url)
            }
        }

        ensureProfile()
    }, [user, profile])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            alert("As senhas não coincidem")
            return
        }

        if (password.length < 6) {
            alert("A senha deve ter pelo menos 6 caracteres")
            return
        }

        setLoading(true)
        try {
            // Update password
            const { error: passwordError } = await supabase.auth.updateUser({ password })
            if (passwordError) throw passwordError

            // Ensure profile is up to date (explicit save)
            const { error: profileError } = await supabase.from("profiles").upsert({
                id: user!.id,
                full_name: name,
                // role and instruments are preserved or set by initial creation
            })
            if (profileError) throw profileError

            alert("Cadastro finalizado com sucesso!")
            navigate("/")

        } catch (error: any) {
            console.error("Error setting password:", error)
            alert("Erro ao finalizar cadastro: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Bem-vindo ao Worship Scales!</CardTitle>
                    <CardDescription>Finalize seu cadastro definindo sua senha e foto.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Avatar Upload */}
                    <div className="flex justify-center">
                        <AvatarUpload
                            userId={user.id}
                            currentAvatarUrl={avatarUrl}
                            onAvatarUpdate={setAvatarUrl}
                            nameFallback={name}
                        />
                    </div>

                    <form id="set-password-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input value={name} disabled className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Nova Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirmar Senha</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </form>
                </CardContent>
                <CardFooter>
                    <Button type="submit" form="set-password-form" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Save className="w-4 h-4 mr-2" /> Finalizar Cadastro
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
