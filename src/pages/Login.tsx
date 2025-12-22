import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export default function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [fullName, setFullName] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isSignUp, setIsSignUp] = useState(false)

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        }
                    }
                })
                if (error) throw error
                // alert("Conta criada com sucesso!") // Remove alert to just auto-login if configured or redirect
                alert("Conta criada! Se o email confirmar for necessário, verifique sua caixa de entrada.")
                if (!error) navigate("/") // Try to navigate if auto-signin works
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                navigate("/")
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center text-primary">
                        Worship Team
                    </CardTitle>
                    <CardDescription className="text-center">
                        {isSignUp ? "Crie sua conta para acessar" : "Entre para ver suas escalas"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuth} className="space-y-4">
                        {isSignUp && (
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome Completo</Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Seu Nome"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && (
                            <div className="flex items-center text-destructive text-sm gap-2">
                                <AlertCircle size={16} />
                                <span>{error}</span>
                            </div>
                        )}
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading ? "Carregando..." : isSignUp ? "Criar Conta" : "Entrar"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Button variant="link" onClick={() => setIsSignUp(!isSignUp)}>
                        {isSignUp ? "Já tem uma conta? Entre" : "Não tem conta? Cadastre-se"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
