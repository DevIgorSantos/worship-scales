import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Search, Edit2 } from "lucide-react"
import type { Database } from "@/types/supabase"
import { Link } from "react-router-dom"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]

const COMMON_INSTRUMENTS = [
    "Vocals", "Violão", "Teclado", "Bateria", "Baixo", "Guitarra", "Sonoplastia", "Mídia"
]

export default function Members() {
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Edit state
    const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
    const [editName, setEditName] = useState("")
    const [editRole, setEditRole] = useState<"admin" | "member">("member")
    const [editInstruments, setEditInstruments] = useState<string[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    useEffect(() => {
        fetchProfiles()
    }, [])

    const fetchProfiles = async () => {
        setLoading(true)
        const { data, error } = await supabase.from("profiles").select("*").order("full_name")
        if (error) console.error("Error fetching profiles:", error)
        else setProfiles(data || [])
        setLoading(false)
    }

    const handleEditClick = (profile: Profile) => {
        setEditingProfile(profile)
        setEditName(profile.full_name || "")
        setEditRole(profile.role || "member")
        setEditInstruments(profile.assigned_instruments || [])
        setIsDialogOpen(true)
    }

    const handleInstrumentToggle = (instrument: string) => {
        setEditInstruments(prev =>
            prev.includes(instrument)
                ? prev.filter(i => i !== instrument)
                : [...prev, instrument]
        )
    }

    const handleSave = async () => {
        if (!editingProfile) return
        setIsSaving(true)
        try {
            const { error } = await supabase.from("profiles").update({
                id: editingProfile.id,
                full_name: editName,
                role: editRole,
                assigned_instruments: editInstruments
            }).eq("id", editingProfile.id)

            if (error) throw error

            fetchProfiles()
            setIsDialogOpen(false)
        } catch (error) {
            console.error("Error updating profile:", error)
            alert("Erro ao atualizar perfil")
        } finally {
            setIsSaving(false)
        }
    }

    const filteredProfiles = profiles.filter(p =>
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="p-4 pb-24 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary">Gestão de Membros</h1>
                <Button variant="outline" size="sm" asChild>
                    <Link to="/gestao/importar-harpa">Importar Harpa</Link>
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar membro..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="grid gap-4">
                    {filteredProfiles.map(profile => (
                        <Card key={profile.id} className="overflow-hidden">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="font-semibold">{profile.full_name || "Sem Nome"}</div>
                                        {profile.role === 'admin' && <Badge variant="destructive" className="text-[10px] h-5">ADMIN</Badge>}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Cadastrado em {new Date(profile.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {profile.assigned_instruments?.map(inst => (
                                            <Badge key={inst} variant="secondary" className="text-[10px] font-normal">
                                                {inst}
                                            </Badge>
                                        ))}
                                        {(!profile.assigned_instruments || profile.assigned_instruments.length === 0) && (
                                            <span className="text-xs text-muted-foreground italic">Sem instrumentos</span>
                                        )}
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(profile)}>
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Membro</DialogTitle>
                        <DialogDescription>Atualize informações e permissões.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input value={editName} onChange={e => setEditName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Nível de Acesso</Label>
                            <Select value={editRole} onValueChange={(v: "admin" | "member") => setEditRole(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="member">Membro</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-3">
                            <Label>Instrumentos / Funções</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {COMMON_INSTRUMENTS.map(inst => (
                                    <div key={inst} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={inst}
                                            checked={editInstruments.includes(inst)}
                                            onCheckedChange={() => handleInstrumentToggle(inst)}
                                        />
                                        <Label htmlFor={inst} className="text-sm font-normal cursor-pointer">{inst}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? "Salvando..." : "Salvar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
