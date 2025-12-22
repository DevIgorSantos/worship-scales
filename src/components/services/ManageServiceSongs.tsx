
import { useState, useEffect } from "react"
import { Plus, Search, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Song = Database["public"]["Tables"]["songs"]["Row"]
type ServiceSong = Database["public"]["Tables"]["service_songs"]["Row"] & {
    songs: Song
}

interface ManageServiceSongsProps {
    serviceId: string
    currentSongs: ServiceSong[]
    onUpdate: () => void
}

export function ManageServiceSongs({ serviceId, currentSongs, onUpdate }: ManageServiceSongsProps) {
    const [open, setOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [searchResults, setSearchResults] = useState<Song[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open && searchTerm) {
            const delayDebounceFn = setTimeout(() => {
                searchSongs()
            }, 300)
            return () => clearTimeout(delayDebounceFn)
        } else {
            setSearchResults([])
        }
    }, [searchTerm, open])

    const searchSongs = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from("songs")
                .select("*")
                .ilike("title", `% ${searchTerm}% `)
                .limit(5)

            if (error) throw error

            // Filter out songs already in the service
            const existingIds = currentSongs.map(s => s.song_id)
            const available = data ? data.filter(song => !existingIds.includes(song.id)) : []

            setSearchResults(available)
        } catch (error) {
            console.error("Error searching songs:", error)
        } finally {
            setLoading(false)
        }
    }

    const addSong = async (songId: string) => {
        try {
            // Get highest order_index
            const maxOrder = currentSongs.length > 0
                ? Math.max(...currentSongs.map(s => s.order_index))
                : 0

            const { error } = await supabase.from("service_songs").insert({
                service_id: serviceId,
                song_id: songId,
                order_index: maxOrder + 1
            })

            if (error) throw error

            onUpdate()
            setSearchTerm("") // Clear search to reset view or keep it? Checking UX.
            // Keeping search allows adding multiple rapid fire if query matches.
            // But let's clear results of that specific song
            setSearchResults(prev => prev.filter(s => s.id !== songId))

        } catch (error) {
            console.error("Error adding song:", error)
        }
    }

    const removeSong = async (id: string) => {
        try {
            const { error } = await supabase
                .from("service_songs")
                .delete()
                .eq("id", id)

            if (error) throw error
            onUpdate()
        } catch (error) {
            console.error("Error removing song:", error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" /> Adicionar Música
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Gerenciar Repertório</DialogTitle>
                    <DialogDescription>
                        Adicione ou remova músicas deste culto.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Add Song Section */}
                    <div className="space-y-2">
                        <Label>Buscar Música</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Digite o título..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        {loading && <p className="text-xs text-muted-foreground">Buscando...</p>}
                        {searchResults.length > 0 && (
                            <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                                {searchResults.map(song => (
                                    <div key={song.id} className="flex items-center justify-between p-2 hover:bg-accent/50">
                                        <div className="text-sm">
                                            <p className="font-medium">{song.title}</p>
                                            <p className="text-xs text-muted-foreground">{song.artist}</p>
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={() => addSong(song.id)}>
                                            <Plus className="w-4 h-4 text-primary" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Current Songs List (Mini View) */}
                    <div className="space-y-2">
                        <Label>Músicas Selecionadas</Label>
                        {currentSongs.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">Nenhuma música adicionada.</p>
                        ) : (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {currentSongs.map((item, index) => (
                                    <div key={item.id} className="flex items-center justify-between p-2 border rounded-md bg-card">
                                        <div className="flex items-center gap-2 text-sm overflow-hidden">
                                            <span className="font-mono text-muted-foreground w-4">{index + 1}.</span>
                                            <div className="truncate">
                                                <p className="font-medium truncate">{item.songs.title}</p>
                                            </div>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => removeSong(item.id)}
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

function Label({ children }: { children: React.ReactNode }) {
    return <h4 className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2">{children}</h4>
}
