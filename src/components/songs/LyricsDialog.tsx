import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Loader2, Music, Save } from "lucide-react"
import { parseSong, transposeLine, transposeSong, getSemitonesBetween, type ParsedLine } from "@/lib/chordUtils"
import { useAuth } from "@/contexts/AuthContext"

interface LyricsDialogProps {
    songId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    songTitle: string
    serviceId?: string
    initialKey?: string | null
    onKeySaved?: (key: string) => void | Promise<void>
}

export function LyricsDialog({
    songId,
    open,
    onOpenChange,
    songTitle,
    serviceId,
    initialKey,
    onKeySaved
}: LyricsDialogProps) {
    const [rawContent, setRawContent] = useState<string | null>(null)
    const [parsedLines, setParsedLines] = useState<ParsedLine[]>([])
    const [loading, setLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [showLyricsOnly, setShowLyricsOnly] = useState(() => {
        const saved = localStorage.getItem("lyricsDialog.showLyricsOnly")
        return saved === "true"
    })

    useEffect(() => {
        localStorage.setItem("lyricsDialog.showLyricsOnly", String(showLyricsOnly))
    }, [showLyricsOnly])

    // New State for Key System
    const [originalTone, setOriginalTone] = useState("C") // Default if not found
    const [selectedTone, setSelectedTone] = useState("C")
    const [isSelectorOpen, setIsSelectorOpen] = useState(false)

    // Calculate dynamic offset
    const transposeOffset = getSemitonesBetween(originalTone, selectedTone)
    const { isAdmin } = useAuth()

    // Reset when songId changes
    useEffect(() => {
        if (open && songId) {
            fetchSongDetails(songId)
        } else {
            setRawContent(null)
            setParsedLines([])
        }
    }, [songId, open])

    // Effect to apply saved key if available (initialKey passed from parent, expected to be "D", "G#", etc now)
    // If we support legacy "offsets" in strings ("+2"), we should handle that gracefully or migrate data. 
    // Assuming for now user only saves NEW keys with this new system. Or we try to parse.
    useEffect(() => {
        if (open && initialKey) {
            // Check if initialKey is a number (legacy offset) or note
            if (/^[+-]?\d+$/.test(initialKey)) {
                // Legacy: offset. We need to add it to originalTone.
                // But originalTone assumes asynchronous fetch.
                // This is tricky. Let's just set selectedTone when we fetch song details.
            } else {
                setSelectedTone(initialKey)
            }
        }
    }, [initialKey, open])

    const fetchSongDetails = async (id: string) => {
        setLoading(true)

        // Fetch song metadata AND lyrics
        const { data: songData } = await supabase
            .from("songs")
            .select("tone")
            .eq("id", id)
            .single()

        const { data: lyricsData } = await supabase
            .from("lyrics")
            .select("content")
            .eq("song_id", id)
            .single()

        setLoading(false)

        let parsedOriginal = "C"
        if (songData && songData.tone) {
            parsedOriginal = songData.tone
        }
        setOriginalTone(parsedOriginal)

        // If we have an initialKey that is a legacy OFFSET, we apply it here
        if (initialKey && /^[+-]?\d+$/.test(initialKey)) {
            // Logic to convert offset to Note?
            // E.g. C + 2 = D. 
            // We need a transposeNote function for the root.
            // Let's defer complexity: If legacy, just maybe show warning or reset to Original.
            // For now: reset to Original if no valid Key string.
            setSelectedTone(parsedOriginal)
        } else if (!initialKey) {
            setSelectedTone(parsedOriginal)
        }
        // If initialKey is a valid Note (e.g. "G"), it was set by the other useEffect, or we set it here if desired. 
        // But the other useEffect relies on 'open'. 
        // Let's refine logic: 
        if (initialKey && !/^[+-]?\d+$/.test(initialKey)) {
            setSelectedTone(initialKey)
        }

        if (lyricsData && lyricsData.content) {
            // ... parsing logic same as before ...
            let contentStr = ""
            if (typeof lyricsData.content === 'string') {
                contentStr = lyricsData.content
            } else if (typeof lyricsData.content === 'object') {
                const jsonContent = lyricsData.content as any
                if (jsonContent.verses) {
                    // Chorus first
                    if (jsonContent.coro) {
                        contentStr += `[Coro]\n${jsonContent.coro.replace(/<br\s*\/?>/gi, '\n')}\n\n`;
                    }

                    contentStr += Object.entries(jsonContent.verses)
                        .map(([key, value]) => `[${key}]\n${(value as string).replace(/<br\s*\/?>/gi, '\n')}`) // Cast value to string just in case
                        .join("\n\n")
                } else if (Array.isArray(jsonContent)) {
                    contentStr = jsonContent.map((s: any) => s.content).join("\n\n")
                }
            }
            setRawContent(contentStr)
            setParsedLines(parseSong(contentStr))
        } else {
            setRawContent(null)
            setParsedLines([])
        }
    }

    const handleSaveKey = async () => {
        if (!songId) return;

        setIsSaving(true)
        try {
            if (serviceId) {
                // Save for specific service
                const { error } = await supabase
                    .from("service_songs")
                    .update({ key: selectedTone })
                    .eq("service_id", serviceId)
                    .eq("song_id", songId)

                if (error) throw error
            } else {
                // Save Default Tone (permanently for the song)
                // 1. Calculate transposed content
                if (!rawContent) throw new Error("No content to save")
                const transposedContent = transposeSong(rawContent, transposeOffset)

                // 2. Update metadata
                const { error: songError } = await supabase
                    .from("songs")
                    .update({ tone: selectedTone })
                    .eq("id", songId)
                if (songError) throw songError

                // 3. Update actual lyrics content
                const { error: lyricsError } = await supabase
                    .from("lyrics")
                    .update({ content: transposedContent })
                    .eq("song_id", songId)
                if (lyricsError) throw lyricsError

                setOriginalTone(selectedTone)
                setRawContent(transposedContent)
                setParsedLines(parseSong(transposedContent))
            }

            if (onKeySaved) await onKeySaved(selectedTone)

            // Optional: Show success toast or feedback?
        } catch (error) {
            console.error("Error saving key:", error)
        } finally {
            setIsSaving(false)
        }
    }

    const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] flex flex-col w-full max-w-3xl">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex flex-col">
                        <DialogTitle className="flex items-center gap-2">
                            {songTitle}
                        </DialogTitle>
                        <DialogDescription>Letra e Cifra</DialogDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center space-x-2 mr-2">
                            <Checkbox
                                id="lyrics-only"
                                checked={showLyricsOnly}
                                onCheckedChange={(checked) => setShowLyricsOnly(checked as boolean)}
                            />
                            <Label htmlFor="lyrics-only" className="text-sm font-medium cursor-pointer hidden sm:inline-block">
                                Apenas Letra
                            </Label>
                        </div>

                        {/* Key Selector */}
                        <Dialog open={isSelectorOpen} onOpenChange={setIsSelectorOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="min-w-[4rem] font-bold">
                                    {selectedTone}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[400px]">
                                <DialogHeader>
                                    <DialogTitle>Selecionar Tom</DialogTitle>
                                    <DialogDescription>
                                        Tom Original: <b>{originalTone}</b>
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-4 gap-2 py-4">
                                    {NOTES.map(note => (
                                        <Button
                                            key={note}
                                            variant={selectedTone === note ? "default" : "outline"}
                                            onClick={() => {
                                                setSelectedTone(note)
                                                setIsSelectorOpen(false)
                                            }}
                                        >
                                            {note}
                                        </Button>
                                    ))}
                                </div>
                            </DialogContent>
                        </Dialog>



                        {isAdmin && (
                            <Button
                                size="sm"
                                onClick={handleSaveKey}
                                disabled={isSaving}
                                className={isSaving ? "opacity-70" : ""}
                                title={serviceId ? "Salvar tom para este culto" : "Salvar tom original da música"}
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                {serviceId ? "Salvar Tom" : "Salvar Padrão"}
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 bg-background border rounded-md font-mono text-sm shadow-inner">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
                    ) : rawContent ? (
                        <div className="space-y-1">
                            {parsedLines.map((line, idx) => {
                                const isChord = line.type === 'chords';

                                if (showLyricsOnly && isChord) return null;

                                const isHeader = line.type === 'header';
                                const styleClass = isChord
                                    ? 'text-primary font-bold'
                                    : isHeader
                                        ? 'text-primary font-bold italic mt-4 mb-2 block' // Added visual separation/styling
                                        : 'text-foreground';

                                return (
                                    <div key={idx} className={`whitespace-pre-wrap min-h-[1.5em] ${styleClass}`}>
                                        {isChord
                                            ? transposeLine(line.content, transposeOffset)
                                            : line.content}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground opacity-50">
                            <Music className="w-12 h-12 mb-4" />
                            <p>Letra/Cifra não disponível</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

