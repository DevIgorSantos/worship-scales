import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Database } from "@/types/supabase"

type SongType = Database["public"]["Enums"]["song_type"]

interface CreateSongDialogProps {
    onSongCreated: () => void
}

export function CreateSongDialog({ onSongCreated }: CreateSongDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState("")
    const [artist, setArtist] = useState("")
    const [link, setLink] = useState("")
    const [type, setType] = useState<SongType>("Louvor")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase.from("songs").insert({
                title,
                artist: artist || null,
                link: link || null,
                type,
            })

            if (error) throw error

            setOpen(false)
            onSongCreated()
            setTitle("")
            setArtist("")
            setLink("")
            setType("Louvor")
        } catch (error) {
            console.error(error)
            alert("Erro ao adicionar música")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>Nova Música</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Adicionar Música</DialogTitle>
                    <DialogDescription>
                        Adicione um novo louvor à biblioteca.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">
                            Título
                        </Label>
                        <Input
                            id="title"
                            className="col-span-3"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="artist" className="text-right">
                            Artista
                        </Label>
                        <Input
                            id="artist"
                            className="col-span-3"
                            value={artist}
                            onChange={(e) => setArtist(e.target.value)}
                            placeholder="Ex: Gabriela Rocha"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Tipo
                        </Label>
                        <Select onValueChange={(val: SongType) => setType(val)} value={type}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Louvor">Louvor</SelectItem>
                                <SelectItem value="Harpa Cristã">Harpa Cristã</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="link" className="text-right">
                            Link
                        </Label>
                        <Input
                            id="link"
                            type="url"
                            className="col-span-3"
                            value={link}
                            onChange={(e) => setLink(e.target.value)}
                            placeholder="YouTube/Spotify Link"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : "Adicionar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
