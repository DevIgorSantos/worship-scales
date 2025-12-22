import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
// import { ScrollArea } from "@/components/ui/scroll-area" // Assumed or define later if missing, or Just div with overflow
// import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface LyricsDialogProps {
    songId: string | null
    open: boolean
    onOpenChange: (open: boolean) => void
    songTitle: string
}

export function LyricsDialog({ songId, open, onOpenChange, songTitle }: LyricsDialogProps) {
    const [lyrics, setLyrics] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    // Reset when songId changes
    useEffect(() => {
        if (open && songId) {
            fetchLyrics(songId)
        } else {
            setLyrics(null)
        }
    }, [songId, open])

    const fetchLyrics = async (id: string) => {
        setLoading(true)
        const { data } = await supabase
            .from("lyrics")
            .select("content")
            .eq("song_id", id)
            .single()

        if (data) {
            setLyrics(data.content)
        } else {
            setLyrics(null)
        }
        setLoading(false)
    }

    const renderContent = () => {
        if (!lyrics) return <p className="text-muted-foreground italic text-center py-4">Letra não indisponível.</p>

        // Check structure based on Harpa
        // { coro: string, verses: Record<string, string> }
        const coro = lyrics.coro ? lyrics.coro.replace(/<br>/g, "\n") : null
        const verses = lyrics.verses || {}

        return (
            <div className="space-y-6 text-center whitespace-pre-wrap">
                {Object.entries(verses).map(([key, value]) => (
                    <div key={key}>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">Verso {key}</p>
                        <p className="leading-relaxed mb-4">{(value as string).replace(/<br>/g, "\n")}</p>

                        {coro && (
                            <div className="bg-muted/30 p-3 rounded-lg border-l-4 border-primary/50 relative mx-4 mb-4">
                                <span className="text-[10px] uppercase font-bold text-primary tracking-widest opacity-70 block mb-1">Coro</span>
                                <p className="font-medium text-lg leading-relaxed">{coro}</p>
                            </div>
                        )}
                    </div>
                ))}

                {/* Fallback for simple content if structure is different but we stored something else */}
                {(!lyrics.verses && !lyrics.coro && typeof lyrics === 'string') && (
                    <p>{lyrics}</p>
                )}
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{songTitle}</DialogTitle>
                    <DialogDescription>Letra da música</DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                    ) : (
                        renderContent()
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
