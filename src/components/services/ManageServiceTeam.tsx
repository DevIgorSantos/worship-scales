import { useState, useEffect } from "react"
import { Search, Plus, Trash2, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
                instrument: selectedInstrument
            })

            if (error) throw error

            onUpdate()
            setSelectedMember("")
            setSelectedInstrument("")
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

    // Filter profiles not already in team (optional, or allow multiple roles)
    // Typically a person can have multiple roles, so we won't strictly filter them out of the list,
    // but maybe visualization helps. For simplicity, show all.

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
                                    {/* Add custom option logic later if needed */}
                                </SelectContent>
                            </Select>

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
                                                <p className="font-medium text-sm truncate">{item.profiles?.full_name}</p>
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
