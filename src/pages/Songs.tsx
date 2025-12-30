import { useState, useEffect } from "react"
import { Music, PlayCircle, FileText, Search, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
// import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CreateSongDialog } from "@/components/songs/CreateSongDialog"
import { LyricsDialog } from "@/components/songs/LyricsDialog"
import { useSongs } from "@/hooks/useSongs"
import type { Database } from "@/types/supabase"

type Song = Database["public"]["Tables"]["songs"]["Row"]

export default function Songs() {
    const { isAdmin } = useAuth()
    const [search, setSearch] = useState("")
    const [currentTab, setCurrentTab] = useState("all") // all, louvor, harpa

    // Pagination
    const [page, setPage] = useState(1)
    const itemsPerPage = 20

    // Reset page when tab or search changes
    useEffect(() => {
        setPage(1)
    }, [currentTab, search])

    const { data: songsData, isLoading: loading, refetch } = useSongs({
        search,
        type: currentTab,
        page,
        limit: itemsPerPage
    })

    const songs = songsData?.data || []
    const totalCount = songsData?.count || 0
    const totalPages = Math.ceil(totalCount / itemsPerPage)

    // Lyrics state
    const [selectedSong, setSelectedSong] = useState<{ id: string, title: string } | null>(null)
    const [isLyricsOpen, setIsLyricsOpen] = useState(false)
    const [songToEdit, setSongToEdit] = useState<Song | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const handleEdit = (song: Song) => {
        setSongToEdit(song)
        setIsEditOpen(true)
    }

    const handleOpenLyrics = (song: Song) => {
        setSelectedSong({ id: song.id, title: song.title })
        setIsLyricsOpen(true)
    }

    const renderPagination = () => {
        if (totalPages <= 1) return null

        return (
            <div className="flex items-center justify-center gap-4 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Anterior
                </Button>
                <span className="text-sm font-medium text-muted-foreground">
                    Página {page} de {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                >
                    Próxima
                    <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
            </div>
        )
    }

    const renderSongList = () => {
        if (loading) {
            return <p className="text-muted-foreground text-center py-8">Carregando...</p>
        }

        if (songs.length === 0) {
            return (
                <div className="text-center py-12 border rounded-lg border-dashed">
                    <p className="text-muted-foreground">Nenhuma música encontrada.</p>
                </div>
            )
        }

        return (
            <div className="space-y-4">
                <div className="grid gap-3">
                    {songs.map((song) => (
                        <Card key={song.id} className="hover:bg-accent/50 transition-colors group min-w-0">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex flex-1 items-center gap-3 overflow-hidden min-w-0">
                                    <div className={`p-2 rounded-full ${song.type === 'Harpa Cristã' ? 'bg-amber-900/50 text-amber-400' : 'bg-blue-900/50 text-blue-400'}`}>
                                        <Music className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-medium truncate">{song.title}</span>
                                        <span className="text-xs text-muted-foreground truncate">{song.artist || "Desconhecido"}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {isAdmin && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-primary"
                                            onClick={() => handleEdit(song)}
                                            title="Editar"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-primary"
                                        onClick={() => handleOpenLyrics(song)}
                                        title="Ver Letra"
                                    >
                                        <FileText className="w-4 h-4" />
                                    </Button>
                                    {song.link && (
                                        <a href={song.link} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-primary transition-colors">
                                            <PlayCircle className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                {renderPagination()}
            </div>
        )
    }

    return (
        <div className="p-4 pb-24 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary to-cyan-200">
                    Músicas
                </h1>
                {isAdmin && <CreateSongDialog onSongCreated={() => refetch()} />}
            </div>

            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <TabsList className="grid w-full sm:w-auto grid-cols-3">
                        <TabsTrigger value="all">Todas</TabsTrigger>
                        <TabsTrigger value="louvor">Louvores</TabsTrigger>
                        <TabsTrigger value="harpa">Harpa Cristã</TabsTrigger>
                    </TabsList>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar música..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                <TabsContent value="all" className="mt-0 space-y-4">
                    {renderSongList()}
                </TabsContent>
                <TabsContent value="louvor" className="mt-0 space-y-4">
                    {renderSongList()}
                </TabsContent>
                <TabsContent value="harpa" className="mt-0 space-y-4">
                    {renderSongList()}
                </TabsContent>
            </Tabs>

            <LyricsDialog
                open={isLyricsOpen}
                onOpenChange={setIsLyricsOpen}
                songId={selectedSong?.id || null}
                songTitle={selectedSong?.title || ""}
                onKeySaved={async () => { await refetch() }}
            />

            <CreateSongDialog
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                songToEdit={songToEdit}
                onSongCreated={() => {
                    refetch()
                    setIsEditOpen(false)
                }}
            />
        </div>
    )
}
