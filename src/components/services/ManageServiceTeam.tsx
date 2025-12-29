import { useState, useEffect } from "react"
import { Plus, Trash2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type ServiceTeam = Database["public"]["Tables"]["service_team"]["Row"] & {
    profiles: Profile
}

interface ManageServiceTeamProps {
    serviceId: string
    currentTeam: ServiceTeam[]
    onUpdate: () => void
}

const COMMON_INSTRUMENTS = [
    "Vocals", "Violão", "Teclado", "Bateria", "Baixo", "Guitarra", "Sonoplastia", "Mídia"
]

export function ManageServiceTeam({ serviceId, currentTeam, onUpdate }: ManageServiceTeamProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [allProfiles, setAllProfiles] = useState<Profile[]>([])

    // Form state
    const [selectedMember, setSelectedMember] = useState<string>("")
    const [selectedInstrument, setSelectedInstrument] = useState<string>("")
    const [isBackup, setIsBackup] = useState(false)

    useEffect(() => {
        if (open) {
            fetchProfiles()
        }
    }, [open])

    const fetchProfiles = async () => {
        const { data } = await supabase.from("profiles").select("*").order("full_name")
        if (data) setAllProfiles(data)
    }

    const addMember = async () => {
        if (!selectedMember || !selectedInstrument) return

        try {
            setLoading(true)
            const { error } = await supabase.from("service_team").insert({
                service_id: serviceId,
                member_id: selectedMember,
                instrument: selectedInstrument,
                role_type: isBackup ? "backup" : "primary",
                status: "confirmed"
            })

            if (error) throw error

            onUpdate()
            setSelectedMember("")
            setSelectedInstrument("")
            setIsBackup(false)
        } catch (error) {
            console.error("Error adding team member:", error)
        } finally {
            setLoading(false)
        }
    }

    const removeMember = async (id: string) => {
        try {
            const { error } = await supabase
                .from("service_team")
                .delete()
                .eq("id", id)

            if (error) throw error
            onUpdate()
        } catch (error) {
            console.error("Error removing team member:", error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <UserPlus className="w-4 h-4" /> Gerenciar Equipe
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Gerenciar Equipe</DialogTitle>
                    <DialogDescription>
                        Aloque membros e instrumentos para este culto.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Add Member Form */}
                    <div className="space-y-3 p-3 border rounded-md bg-accent/20">
                        <h4 className="text-sm font-medium">Adicionar Membro</h4>
                        <div className="grid gap-2">
                            <Select value={selectedMember} onValueChange={setSelectedMember}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o membro" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allProfiles.map(profile => (
                                        <SelectItem key={profile.id} value={profile.id}>
                                            {profile.full_name || "Sem nome"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Instrumento/Função" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COMMON_INSTRUMENTS.map(inst => (
                                        <SelectItem key={inst} value={inst}>
                                            {inst}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="backup"
                                    checked={isBackup}
                                    onChange={(e) => setIsBackup(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="backup" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Adicionar como Reserva
                                </label>
                            </div>

                            <Button onClick={addMember} disabled={!selectedMember || !selectedInstrument || loading}>
                                <Plus className="w-4 h-4 mr-2" /> Adicionar
                            </Button>
                        </div>
                    </div>

                    {/* Current Team List */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Equipe Escalada</h4>
                        {currentTeam.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">Ninguém escalado ainda.</p>
                        ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {currentTeam.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-2 border rounded-md bg-card">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                                                {item.profiles?.full_name?.slice(0, 2) || "??"}
                                            </div>
                                            <div className="truncate">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-sm truncate">{item.profiles?.full_name}</p>
                                                    {item.role_type === "backup" && (
                                                        <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded border border-yellow-200">
                                                            Reserva
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{item.instrument}</p>
                                            </div>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => removeMember(item.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
