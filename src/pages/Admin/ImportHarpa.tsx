import { useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { supabase } from "../../lib/supabase"
import { Button } from "../../components/ui/button"
import { Progress } from "../../components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function ImportHarpa() {
    const { isAdmin } = useAuth()
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [status, setStatus] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleImport = async () => {
        if (!isAdmin) {
            setError("Apenas administradores podem realizar esta ação.")
            return
        }

        setLoading(true)
        setProgress(0)
        setStatus("Iniciando importação...")
        setError(null)
        setSuccess(false)

        try {
            // 1. Fetch JSON file
            const response = await fetch("/harpa_crista_640_hinos.json")
            if (!response.ok) {
                throw new Error("Falha ao carregar o arquivo JSON.")
            }
            const data = await response.json()

            const keys = Object.keys(data).filter((key) => key !== "-1")
            const total = keys.length
            let processed = 0

            // 2. Iterate and enable/disable batching if needed
            // Doing one by one to ensure relationships are correct and handle errors easier, 
            // though slower. 640 items is manageable.

            for (const key of keys) {
                const item = data[key]

                // Prepare song data
                const title = item.hino
                const artist = "Harpa Cristã"
                const type = "Harpa Cristã"

                // Insert Song
                // Check if exists first to avoid duplicates? 
                // For now, let's assume we want to skip if exactly same title exists or just insert.
                // User said "cadastrá-los", implying new data.
                // Let's check duplicate by title to be safe.

                const { data: existing } = await supabase
                    .from('songs')
                    .select('id')
                    .eq('title', title)
                    .single()

                let songId = existing?.id

                if (!songId) {
                    const { data: newSong, error: songError } = await supabase.from("songs").insert({
                        title,
                        artist,
                        type,
                        link: "", // No link for now
                    }).select().single()

                    if (songError) {
                        console.error(`Error inserting song ${title}:`, songError)
                        continue // Skip this one
                    }
                    songId = newSong.id
                }

                // Insert Lyrics
                // Structure based on user feedback: keeping Harpa format for Harpa
                const lyricsContent = {
                    coro: item.coro,
                    verses: item.verses
                }

                // Check if lyrics exist
                const { data: existingLyrics } = await supabase
                    .from('lyrics')
                    .select('id')
                    .eq('song_id', songId)
                    .single()

                if (!existingLyrics) {
                    const { error: lyricsError } = await supabase.from("lyrics").insert({
                        song_id: songId,
                        content: lyricsContent
                    })

                    if (lyricsError) {
                        console.error(`Error inserting lyrics for ${title}:`, lyricsError)
                    }
                }

                processed++
                setProgress(Math.round((processed / total) * 100))
                setStatus(`Importando: ${title} (${processed}/${total})`)
            }

            setSuccess(true)
            setStatus("Importação concluída com sucesso!")

        } catch (err: any) {
            setError(err.message || "Ocorreu um erro durante a importação.")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    if (!isAdmin) {
        return <div className="p-8 text-center">Acesso negado.</div>
    }

    return (
        <div className="container mx-auto py-10 max-w-2xl space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Importar Harpa Cristã</CardTitle>
                    <CardDescription>
                        Importação dos 640 hinos da Harpa Cristã para o banco de dados.
                        <br />
                        <strong>Atenção:</strong> Isso pode levar alguns minutos.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erro</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {success && (
                        <Alert className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertTitle>Sucesso!</AlertTitle>
                            <AlertDescription>Todos os hinos foram processados.</AlertDescription>
                        </Alert>
                    )}

                    {loading && (
                        <div className="space-y-2">
                            <Progress value={progress} />
                            <p className="text-sm text-muted-foreground text-center">{status}</p>
                        </div>
                    )}

                    {!loading && !success && (
                        <Button onClick={handleImport} className="w-full">
                            Iniciar Importação
                        </Button>
                    )}

                    {!loading && success && (
                        <Button onClick={() => setSuccess(false)} variant="outline" className="w-full">
                            Realizar Nova Importação (Reiniciar)
                        </Button>
                    )}

                </CardContent>
            </Card>
        </div>
    )
}
