import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { Database } from "@/types/supabase"

type SongType = Database["public"]["Enums"]["song_type"]
type Song = Database["public"]["Tables"]["songs"]["Row"]

interface CreateSongDialogProps {
    onSongCreated: () => void
    songToEdit?: Song | null
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function CreateSongDialog({ onSongCreated, songToEdit, open: controlledOpen, onOpenChange: setControlledOpen }: CreateSongDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
    const setOpen = setControlledOpen || setInternalOpen

    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState("")
    const [artist, setArtist] = useState("")
    const [link, setLink] = useState("")
    const [type, setType] = useState<SongType>("Louvor")
    const [tone, setTone] = useState("C")
    const [lyrics, setLyrics] = useState("")

    const isEditing = !!songToEdit

    useEffect(() => {
        if (songToEdit) {
            setTitle(songToEdit.title)
            setArtist(songToEdit.artist || "")
            setLink(songToEdit.link || "")
            setType(songToEdit.type)
            setTone(songToEdit.tone || "C")
            fetchLyrics(songToEdit.id)
        } else {
            // Reset for new song handled in cleanup or when closing? 
            // Better to reset when dialog opens/closes in a different way, but for now:
            if (isOpen && !songToEdit) {
                // Only reset if we are ensuring it's a "New" mode. 
                // But this effect runs on songToEdit change.
            }
        }
    }, [songToEdit])

    // Reset form when dialog closes/opens
    useEffect(() => {
        if (!isOpen) {
            // Optional: reset fields? 
            // If we are sharing the dialog for create/edit, we should reset when opening for create.
            // But this component logic implies it's either mounted with songToEdit or not, OR usage pattern updates.
        } else if (!songToEdit) {
            setTitle("")
            setArtist("")
            setLink("")
            setLink("")
            setType("Louvor")
            setTone("C")
            setLyrics("")
        }
    }, [isOpen, songToEdit])

    const fetchLyrics = async (songId: string) => {
        setLoading(true)
        const { data } = await supabase
            .from("lyrics")
            .select("content")
            .eq("song_id", songId)
            .single()

        if (data && data.content) {
            if (typeof data.content === 'object') {
                setLyrics(formatLyricsForDisplay(data.content))
            } else if (typeof data.content === 'string') {
                // Check if string is actually JSON
                try {
                    const json = JSON.parse(data.content)
                    setLyrics(formatLyricsForDisplay(json))
                } catch {
                    setLyrics(data.content)
                }
            }
        } else {
            setLyrics("")
        }
        setLoading(false)
    }

    const formatLyricsForDisplay = (content: any): string => {
        let text = []

        // Linear Format (Array)
        if (Array.isArray(content)) {
            for (const section of content) {
                if (section.type === 'verse') {
                    text.push(`[${section.label || 'Verso'}]`)
                } else if (section.type === 'chorus') {
                    text.push(`[Refrão]`) // Or Coro
                } else if (section.type === 'bridge') {
                    text.push(`[${section.label || 'Ponte'}]`)
                }
                text.push(section.content)
                text.push("") // Empty line between sections
            }
        }
        // Harpa Format (Object with verses/coro keys)
        else if (content.verses) {
            // Try to Sort verses numerically if possible
            const keys = Object.keys(content.verses).sort((a, b) => {
                const na = parseInt(a)
                const nb = parseInt(b)
                if (!isNaN(na) && !isNaN(nb)) return na - nb
                return a.localeCompare(b)
            })

            for (const key of keys) {
                text.push(`[Verso ${key}]`)
                text.push(content.verses[key])
                text.push("")

                // If we want to simulate Cifra Club style, we might put Chorus after V1, V2 etc?
                // But Harpa usually has strict structure.
                // Let's just append Coro at the end or begin?
                // Usually Harpa has Verse 1, Coro, Verse 2, Coro...
                // But our storage separates them.
                // Let's just dump Coro at the end if exists, or user can rearrange.
            }

            if (content.coro) {
                text.push(`[Coro]`)
                text.push(content.coro)
                text.push("")
            }
        }

        return text.join("\n").trim()
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let songId = songToEdit?.id
            console.log("Saving song...", { isEditing, songId, title })

            if (isEditing && songId) {
                const { error } = await supabase.from("songs").update({
                    title,
                    artist: artist || null,
                    link: link || null,
                    type,
                    tone,
                }).eq("id", songId)
                if (error) {
                    console.error("Error updating song:", error)
                    throw error
                }
            } else {
                const { data, error } = await supabase.from("songs").insert({
                    title,
                    artist: artist || null,
                    link: link || null,
                    type,
                    tone,
                }).select().single()

                if (error) {
                    console.error("Error creating song:", error)
                    throw error
                }
                songId = data.id
            }

            // Handle Lyrics
            if (songId) {
                const contentToSave = parseLyrics(lyrics)
                console.log("Parsed lyrics content:", contentToSave)

                // Fetch ALL existing lyrics for this song to handle duplicates
                const { data: existingLyricsList, error: fetchError } = await supabase
                    .from("lyrics")
                    .select("id")
                    .eq("song_id", songId)

                if (fetchError) {
                    console.error("Error fetching lyrics:", fetchError)
                }

                if (existingLyricsList && existingLyricsList.length > 0) {
                    if (contentToSave) {
                        // Update the first one
                        const firstLyrics = existingLyricsList[0]
                        console.log("Updating existing lyrics...", firstLyrics.id)

                        const { error: updateError } = await supabase.from("lyrics").update({
                            content: contentToSave
                        }).eq("id", firstLyrics.id)

                        if (updateError) console.error("Error updating lyrics:", updateError)

                        // Delete duplicates if any
                        if (existingLyricsList.length > 1) {
                            console.warn("Found duplicate lyrics rows, deleting extras...")
                            const idsToDelete = existingLyricsList.slice(1).map(l => l.id)
                            await supabase.from("lyrics").delete().in("id", idsToDelete)
                        }
                    } else {
                        // Content is empty, delete ALL existing lyrics for this song
                        const idsToDelete = existingLyricsList.map(l => l.id)
                        console.log("Lyrics cleared, deleting existing entries...", idsToDelete)

                        const { error: deleteError, count } = await supabase
                            .from("lyrics")
                            .delete({ count: 'exact' })
                            .in("id", idsToDelete)

                        if (deleteError) {
                            console.error("Error deleting lyrics:", deleteError)
                        } else {
                            console.log(`Deleted ${count} rows. Verifying...`)
                            // Verify deletion
                            const { count: remaining } = await supabase
                                .from("lyrics")
                                .select("id", { count: 'exact', head: true })
                                .in("id", idsToDelete)

                            if (remaining && remaining > 0) {
                                console.error("CRITICAL: Rows were NOT deleted despite no error!", remaining)
                                alert("Erro Crítico: O banco de dados recusou a exclusão. Verifique permissões (RLS).")
                            } else {
                                console.log("Verification success: Rows make gone.")
                            }
                        }
                    }

                } else if (contentToSave) { // Only insert if we have content
                    console.log("Inserting new lyrics...")
                    const { error: insertError } = await supabase.from("lyrics").insert({
                        song_id: songId,
                        content: contentToSave
                    })
                    if (insertError) console.error("Error inserting lyrics:", insertError)
                }
            }

            setOpen(false)
            onSongCreated()
            if (!isEditing) {
                setTitle("")
                setArtist("")
                setLink("")
                setLink("")
                setType("Louvor")
                setTone("C")
                setLyrics("")
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const parseLyrics = (input: string) => {
        if (!input || !input.trim()) return null

        try {
            // Try valid JSON first
            return JSON.parse(input)
        } catch {
            // Not JSON, try to parse tagged text
            const lines = input.split(/\r?\n/)

            // If it's NOT Harpa Cristã, use linear structure to preserve order
            if (type !== 'Harpa Cristã') {
                const sections: any[] = []
                let currentType = 'verse'
                let currentContent: string[] = []
                let verseCount = 0
                let bridgeCount = 0

                const saveCurrentSection = (nextType: string) => {
                    const text = currentContent.join('\n').trim()
                    if (text) {
                        let label = undefined
                        if (currentType === 'verse') {
                            verseCount++
                            label = `Verso ${verseCount}`
                        } else if (currentType === 'bridge') {
                            bridgeCount++
                            label = bridgeCount > 1 ? `Ponte ${bridgeCount}` : `Ponte`
                        }

                        sections.push({
                            type: currentType,
                            label,
                            content: text
                        })
                    }
                    currentContent = []
                    currentType = nextType
                }

                // Check tags
                const hasTags = lines.some(line =>
                    /^\s*(verse|verso|estrofe|chorus|coro|refrão|refrao|bridge|ponte)s?\s*$/i.test(line)
                )

                // If explicit tags are not found, but we are in "Louvor" mode and input is not empty (checked at start),
                // wrap as Verse 1.
                if (!hasTags) return { verses: { "1": input.trim() } }

                for (const line of lines) {
                    if (/^\s*(verse|verso|estrofe)s?\s*$/i.test(line)) {
                        saveCurrentSection('verse')
                        continue
                    }
                    if (/^\s*(chorus|coro|refrão|refrao)s?\s*$/i.test(line)) {
                        saveCurrentSection('chorus')
                        continue
                    }
                    if (/^\s*(bridge|ponte)s?\s*$/i.test(line)) {
                        saveCurrentSection('bridge')
                        continue
                    }
                    currentContent.push(line)
                }
                saveCurrentSection('') // save last
                return sections
            }

            // Fallback to grouped structure for Harpa
            const verses: Record<string, string> = {}
            let coro = ""

            let currentType = 'verse'
            let currentContent: string[] = []
            let verseCount = 0
            let bridgeCount = 0

            const saveCurrentSection = () => {
                const text = currentContent.join('\n').trim()
                if (text) {
                    if (currentType === 'chorus') {
                        if (!coro) coro = text
                    } else if (currentType === 'bridge') {
                        bridgeCount++
                        const key = bridgeCount > 1 ? `Ponte ${bridgeCount}` : `Ponte`
                        verses[key] = text
                    } else { // verse
                        verseCount++
                        verses[String(verseCount)] = text
                    }
                }
                currentContent = []
            }

            const hasTags = lines.some(line =>
                /^\s*(verse|verso|estrofe|chorus|coro|refrão|refrao|bridge|ponte)s?\s*$/i.test(line)
            )

            if (!hasTags) {
                return { verses: { "1": input.trim() } }
            }

            for (const line of lines) {
                if (/^\s*(verse|verso|estrofe)s?\s*$/i.test(line)) {
                    saveCurrentSection()
                    currentType = 'verse'
                    continue
                }
                if (/^\s*(chorus|coro|refrão|refrao)s?\s*$/i.test(line)) {
                    saveCurrentSection()
                    currentType = 'chorus'
                    continue
                }
                if (/^\s*(bridge|ponte)s?\s*$/i.test(line)) {
                    saveCurrentSection()
                    currentType = 'bridge'
                    continue
                }

                currentContent.push(line)
            }
            saveCurrentSection()

            return { verses, coro: coro || undefined }
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            {/* If not controlled, show trigger. But usually if songToEdit is passed we expect parent control or we only use this for New Song. 
                For now we keep the trigger if no controlled props. */
                controlledOpen === undefined && (
                    <DialogTrigger asChild>
                        <Button>Nova Música</Button>
                    </DialogTrigger>
                )
            }
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Música" : "Adicionar Música"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Edite os detalhes da música." : "Adicione um novo louvor à biblioteca."}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto pr-4">
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
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="tone" className="text-right">
                                Tom Original
                            </Label>
                            <Select onValueChange={setTone} value={tone}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecione o tom" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="C">C</SelectItem>
                                    <SelectItem value="C#">C# / Db</SelectItem>
                                    <SelectItem value="D">D</SelectItem>
                                    <SelectItem value="D#">D# / Eb</SelectItem>
                                    <SelectItem value="E">E</SelectItem>
                                    <SelectItem value="F">F</SelectItem>
                                    <SelectItem value="F#">F# / Gb</SelectItem>
                                    <SelectItem value="G">G</SelectItem>
                                    <SelectItem value="G#">G# / Ab</SelectItem>
                                    <SelectItem value="A">A</SelectItem>
                                    <SelectItem value="A#">A# / Bb</SelectItem>
                                    <SelectItem value="B">B</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="lyrics" className="text-right pt-2">
                                Letra / Cifra
                            </Label>
                            <Textarea
                                id="lyrics"
                                className="col-span-3 min-h-[300px] font-mono text-sm"
                                value={lyrics}
                                onChange={(e) => setLyrics(e.target.value)}
                                placeholder={`Exemplo:
[Verso 1]
D        A
Deus é bom
                                `}
                            />
                        </div>
                        <DialogFooter className="mt-4">
                            <Button type="submit" disabled={loading}>
                                {loading ? "Salvando..." : (isEditing ? "Salvar Alterações" : "Adicionar")}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
