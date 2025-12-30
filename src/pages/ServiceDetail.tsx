import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar, Clock, ArrowLeft, CheckCircle, Circle, Music, User, PlayCircle, FileText, Pencil, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import type { Database } from "@/types/supabase"
import { ManageServiceSongs } from "@/components/services/ManageServiceSongs"
import { ManageServiceTeam } from "@/components/services/ManageServiceTeam"
import { LyricsDialog } from "@/components/songs/LyricsDialog"
import { ServiceDialog } from "@/components/services/ServiceDialog"

type Service = Database["public"]["Tables"]["services"]["Row"]
type ServiceSong = Database["public"]["Tables"]["service_songs"]["Row"] & {
    songs: Database["public"]["Tables"]["songs"]["Row"]
}
type ServiceTeam = Database["public"]["Tables"]["service_team"]["Row"] & {
    profiles: Database["public"]["Tables"]["profiles"]["Row"]
}

const getServiceTypeLabel = (type: string) => {
    switch (type) {
        case "Sunday School": return "Escola Bíblica Dominical";
        case "Sunday Service": return "Culto de Domingo";
        case "Tuesday": return "Culto de Terça-feira";
        case "Thursday": return "Culto de Quinta-feira";
        case "Special": return "Especial";
        default: return type;
    }
}

export default function ServiceDetail() {
    const { id } = useParams<{ id: string }>()
    // ... existing hooks ...
    const navigate = useNavigate()
    const { user, isAdmin } = useAuth()
    const [service, setService] = useState<Service | null>(null)
    const [songs, setSongs] = useState<ServiceSong[]>([])
    const [team, setTeam] = useState<ServiceTeam[]>([])
    const [loading, setLoading] = useState(true)
    const [isAcknowledged, setIsAcknowledged] = useState(false)

    // Lyrics Dialog State
    const [selectedSong, setSelectedSong] = useState<{ id: string, title: string, key?: string | null } | null>(null)
    const [isLyricsOpen, setIsLyricsOpen] = useState(false)

    useEffect(() => {
        if (!id) return
        fetchServiceDetails()
    }, [id])

    const fetchServiceDetails = async () => {
        setLoading(true)
        try {
            // Fetch Service Info
            const { data: serviceData, error: serviceError } = await supabase
                .from("services")
                .select("*")
                .eq("id", id!)
                .single()
            if (serviceError) throw serviceError
            setService(serviceData)

            // Fetch Songs
            const { data: songsData, error: songsError } = await supabase
                .from("service_songs")
                .select("*, songs(*)")
                .eq("service_id", id!)
                .order("order_index", { ascending: true })
            if (songsError) {
                console.error("Error fetching songs:", songsError) // Non-critical
            } else {
                // @ts-ignore - Supabase types are tricky with joins, forcing type for simplicity
                setSongs(songsData as any)
            }

            // Fetch Team
            const { data: teamData, error: teamError } = await supabase
                .from("service_team")
                .select("*, profiles(*)")
                .eq("service_id", id!)
            if (teamError) {
                console.error("Error fetching team:", teamError)
            } else {
                // @ts-ignore
                setTeam(teamData as any)
            }

            // Check Acknowledgment
            if (user) {
                const { data: ack, error: ackError } = await supabase
                    .from("acknowledgments")
                    .select("*")
                    .eq("service_id", id!)
                    .eq("member_id", user.id)
                    .maybeSingle()

                if (!ackError && ack) {
                    setIsAcknowledged(true)
                }
            }

        } catch (error) {
            console.error("Error loading service:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleAcknowledge = async () => {
        if (!user || !id) return
        try {
            const { error } = await supabase.from("acknowledgments").insert({
                service_id: id,
                member_id: user.id
            })
            if (error) throw error
            setIsAcknowledged(true)
        } catch (error) {
            console.error("Error acknowledging:", error)
            alert("Erro ao confirmar leitura.")
        }
    }

    const handleOpenLyrics = (serviceSong: ServiceSong) => {
        setSelectedSong({
            id: serviceSong.songs.id,
            title: serviceSong.songs.title,
            key: serviceSong.key
        })
        setIsLyricsOpen(true)
    }

    const handleMarkUnavailable = async (member: ServiceTeam) => {
        if (!confirm("Confirmar que você não poderá comparecer? O sistema tentará encontrar um substituto.")) return

        console.log("Starting handleMarkUnavailable for:", member)
        setLoading(true)
        try {
            // Find Substitution Candidate
            // We fetch the latest team first to ensure accuracy
            console.log("Fetching latest team data...")
            const { data: latestTeam, error: fetchError } = await supabase
                .from("service_team")
                .select("*, profiles(*)")
                .eq("service_id", id!)

            if (fetchError || !latestTeam) throw fetchError || new Error("Failed to reload team")

            const currentMemberInstrument = member.instrument
            console.log("Searching for backup in instrument:", currentMemberInstrument)

            // Candidates: Backups for the SAME instrument, who are confirmed
            const candidates = latestTeam.filter(t =>
                t.role_type === "backup" &&
                t.status === "confirmed" &&
                t.instrument === currentMemberInstrument
            )
            console.log("Candidates found:", candidates)

            let selectedCandidate: any = null

            for (const candidate of candidates) {
                // Rule 3.3: Check if candidate already has a PRIMARY role
                const existingPrimaryRole = latestTeam.find(t =>
                    t.member_id === candidate.member_id &&
                    t.role_type === "primary" &&
                    t.status === "confirmed"
                )

                if (existingPrimaryRole) {
                    const existingInst = existingPrimaryRole.instrument
                    const neededInst = currentMemberInstrument

                    const isExistingVocal = existingInst === "Vocals" || existingInst === "Vocal"
                    const isNeededVocal = neededInst === "Vocals" || neededInst === "Vocal"

                    console.log(`Checking conflict for candidate ${candidate.profiles?.full_name}: Existing=${existingInst}, Needed=${neededInst}`)

                    // Allowed: Instrument + Vocal OR Vocal + Instrument
                    if ((isExistingVocal && !isNeededVocal) || (!isExistingVocal && isNeededVocal)) {
                        selectedCandidate = candidate
                        console.log("Candidate selected (Conflict resolved allowed):", candidate)
                        break
                    }
                    console.log("Candidate skipped due to conflict.")
                } else {
                    selectedCandidate = candidate
                    console.log("Candidate selected (No conflict):", candidate)
                    break
                }
            }

            console.log("Calling perform_substitution RPC...")
            // Perform Secure Update via RPC
            const { error: rpcError } = await supabase.rpc("perform_substitution", {
                unavailable_team_id: member.id,
                backup_team_id: selectedCandidate ? selectedCandidate.id : null
            })

            if (rpcError) {
                console.error("RPC Error:", rpcError)
                throw rpcError
            } else {
                console.log("RPC Success")
            }

            if (selectedCandidate) {
                alert(`Você marcou indisponibilidade. ${selectedCandidate.profiles?.full_name} assumiu seu lugar como ${currentMemberInstrument}.`)
            } else {
                alert("Você marcou indisponibilidade. Nenhum reserva disponível foi encontrado para sua função.")
            }

            await fetchServiceDetails()

        } catch (error: any) {
            console.error("Error marking unavailable:", error)
            alert("Erro ao processar: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteService = async () => {
        if (!service || !id) return

        const confirm = window.confirm("Tem certeza que deseja excluir esta escala? Esta ação não pode ser desfeita.")
        if (!confirm) return

        try {
            setLoading(true)
            const { error } = await supabase
                .from("services")
                .delete()
                .eq("id", id)

            if (error) throw error

            navigate("/escalas")
        } catch (error) {
            console.error("Error deleting service:", error)
            alert("Erro ao excluir culto.")
            setLoading(false)
        }
    }

    const handleKeySaved = async (newKey: string) => {
        // Optimistically update the selected song state so if the user reopens the dialog, it has the new key
        if (selectedSong) {
            setSelectedSong({
                ...selectedSong,
                key: newKey
            })
        }
        await fetchServiceDetails()
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Carregando detalhes do culto...</div>
    }

    if (!service) {
        return <div className="p-8 text-center text-red-500">Culto não encontrado.</div>
    }

    return (
        <div className="p-4 pb-24 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">{getServiceTypeLabel(service.type)}</h1>
                        {service.description && (
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                        )}
                    </div>
                </div>
                {isAdmin && (
                    <div className="flex items-center gap-2">
                        <ServiceDialog
                            onUpdate={fetchServiceDetails}
                            serviceToEdit={service}
                            trigger={
                                <Button variant="ghost" size="icon">
                                    <Pencil className="w-5 h-5 text-muted-foreground" />
                                </Button>
                            }
                        />
                        <Button variant="ghost" size="icon" onClick={handleDeleteService}>
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Service Info Card */}
            <Card className="border-l-4 border-l-primary bg-card/50">
                <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-lg font-medium">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="capitalize">
                            {format(new Date(service.date + "T" + service.time), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-5 h-5" />
                        <span>{service.time.slice(0, 5)}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Setlist */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Music className="w-5 h-5 text-primary" />
                        Repertório
                    </h2>
                    {isAdmin && id && (
                        <ManageServiceSongs
                            serviceId={id}
                            currentSongs={songs}
                            onUpdate={fetchServiceDetails}
                        />
                    )}
                </div>

                {songs.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic ml-2">Nenhuma música selecionada.</p>
                ) : (
                    <div className="space-y-6">
                        {/* Harpa Section */}
                        {songs.some(s => s.songs?.type === "Harpa Cristã") && (
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 pl-1">Harpa Cristã</h3>
                                <div className="space-y-2">
                                    {songs.filter(s => s.songs?.type === "Harpa Cristã").map((item, index) => (
                                        <Card key={item.id} className="hover:bg-accent/50 transition-colors">
                                            <CardContent className="p-3 flex items-center gap-3">
                                                {/* Use original index or relative index? User likely wants order. 
                                                    Let's keep the numbered list feel but separated. 
                                                    Actually, "order_index" is global.
                                                */}
                                                <span className="text-muted-foreground font-mono text-sm w-4">{index + 1}.</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium truncate">{item.songs?.title}</p>
                                                        {item.key && (
                                                            <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                                {/^[+-]?\d+$/.test(item.key)
                                                                    ? `${parseInt(item.key) > 0 ? '+' : ''}${item.key}`
                                                                    : item.key}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">{item.songs?.artist}</p>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => handleOpenLyrics(item)}
                                                        title="Ver Letra"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </Button>
                                                    {item.songs?.link && (
                                                        <a href={item.songs.link} target="_blank" rel="noopener noreferrer" className="p-2 text-primary hover:bg-primary/10 rounded-full">
                                                            <PlayCircle className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Worship Section */}
                        {songs.some(s => s.songs?.type === "Louvor") && (
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 pl-1">Louvores</h3>
                                <div className="space-y-2">
                                    {songs.filter(s => s.songs?.type === "Louvor").map((item, index) => (
                                        <Card key={item.id} className="hover:bg-accent/50 transition-colors">
                                            <CardContent className="p-3 flex items-center gap-3">
                                                <span className="text-muted-foreground font-mono text-sm w-4">{index + 1}.</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium truncate">{item.songs?.title}</p>
                                                        {item.key && (
                                                            <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                                {/^[+-]?\d+$/.test(item.key)
                                                                    ? `${parseInt(item.key) > 0 ? '+' : ''}${item.key}`
                                                                    : item.key}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">{item.songs?.artist}</p>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        onClick={() => handleOpenLyrics(item)}
                                                        title="Ver Letra"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </Button>
                                                    {item.songs?.link && (
                                                        <a href={item.songs.link} target="_blank" rel="noopener noreferrer" className="p-2 text-primary hover:bg-primary/10 rounded-full">
                                                            <PlayCircle className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Team */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Equipe
                    </h2>
                    {isAdmin && id && (
                        <ManageServiceTeam
                            serviceId={id}
                            currentTeam={team}
                            onUpdate={fetchServiceDetails}
                        />
                    )}
                </div>

                {team.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic ml-2">Equipe não definida.</p>
                ) : (
                    <div className="space-y-6">
                        {/* Titulares */}
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-4 pl-1 border-b pb-1">TITULARES</h3>

                            {Array.from(new Set(team.filter(m => m.role_type === 'primary').map(m => m.instrument))).sort().map(instrument => (
                                <div key={instrument} className="mb-6">
                                    <h4 className="text-xs font-bold text-muted-foreground/80 uppercase mb-2 pl-1 tracking-wider">{instrument === 'Vocals' ? 'Vocal' : instrument}</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {team.filter(m => m.role_type === 'primary' && m.instrument === instrument).map((member) => {
                                            const isMe = user?.id === member.member_id
                                            const isUnavailable = member.status === "unavailable"

                                            return (
                                                <div key={member.id} className={`relative flex flex-col p-3 bg-card border rounded-lg ${isUnavailable ? "opacity-60 bg-red-50/10 border-red-200/20" : ""}`}>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="w-8 h-8 shrink-0">
                                                            <AvatarImage src={member.profiles?.avatar_url || undefined} className="object-cover" />
                                                            <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs uppercase">
                                                                {member.profiles?.full_name?.slice(0, 2) || "??"}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div className="overflow-hidden min-w-0 flex-1">
                                                            <p className={`font-medium text-sm truncate ${isUnavailable ? "line-through decoration-red-500" : ""}`}>
                                                                {member.profiles?.full_name}
                                                            </p>
                                                            {/* Instrument is redundant now, but keep for clarity or remove? User asked for grouping. I'll keep it but maybe smaller or remove. I'll keep it for now. */}
                                                            {isUnavailable && <p className="text-[10px] text-red-500 font-bold uppercase mt-0.5">Indisponível</p>}
                                                        </div>
                                                    </div>

                                                    {/* Action for "Me" */}
                                                    {isMe && !isUnavailable && !isAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="mt-2 h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 w-full"
                                                            onClick={() => handleMarkUnavailable(member)}
                                                        >
                                                            Não poderei ir
                                                        </Button>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Reservas */}
                        {team.some(m => m.role_type === "backup") && (
                            <div className="mt-8">
                                <h3 className="text-sm font-semibold text-muted-foreground mb-4 pl-1 border-b pb-1">RESERVAS</h3>

                                {Array.from(new Set(team.filter(m => m.role_type === 'backup').map(m => m.instrument))).sort().map(instrument => (
                                    <div key={instrument} className="mb-6">
                                        <h4 className="text-xs font-bold text-muted-foreground/80 uppercase mb-2 pl-1 tracking-wider">{instrument === 'Vocals' ? 'Vocal' : instrument}</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {team.filter(m => m.role_type === 'backup' && m.instrument === instrument).map((member) => (
                                                <div key={member.id} className="flex items-center gap-3 p-3 bg-yellow-50/5 border border-yellow-200/20 rounded-lg">
                                                    <Avatar className="w-8 h-8 shrink-0">
                                                        <AvatarImage src={member.profiles?.avatar_url || undefined} className="object-cover" />
                                                        <AvatarFallback className="bg-yellow-200/20 text-yellow-600 font-bold text-xs uppercase">
                                                            {member.profiles?.full_name?.slice(0, 2) || "??"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="overflow-hidden">
                                                        <p className="font-medium text-sm truncate text-yellow-600/90">{member.profiles?.full_name}</p>
                                                        {/* <p className="text-xs text-muted-foreground capitalize">{member.instrument}</p> */}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto">
                {isAcknowledged ? (
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white" disabled>
                        <CheckCircle className="mr-2 w-4 h-4" />
                        Leitura Confirmada
                    </Button>
                ) : (
                    <Button className="w-full" onClick={handleAcknowledge}>
                        <Circle className="mr-2 w-4 h-4" />
                        Confirmar Leitura
                    </Button>
                )}
            </div>

            <LyricsDialog
                open={isLyricsOpen}
                onOpenChange={setIsLyricsOpen}
                songId={selectedSong?.id || null}
                songTitle={selectedSong?.title || ""}
                serviceId={id}
                initialKey={selectedSong?.key}
                onKeySaved={handleKeySaved}
            />
        </div>
    )
}
