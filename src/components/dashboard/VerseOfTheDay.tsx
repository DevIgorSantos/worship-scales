import { useEffect, useState } from "react"
import { Quote } from "lucide-react"
import { fetchDailyVerse } from "../../lib/scraper"

interface Verse {
    book: { name: string, author: string, group: string }
    chapter: number
    number: number
    text: string
}

export function VerseOfTheDay() {
    const [verse, setVerse] = useState<Verse | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchVerse = async () => {
            const today = new Date().toLocaleDateString()
            const CACHE_KEY = "verse_of_the_day"

            // 1. Try Cache
            try {
                const cached = localStorage.getItem(CACHE_KEY)
                if (cached) {
                    const parsed = JSON.parse(cached)
                    if (parsed.date === today && parsed.verse) {
                        setVerse(parsed.verse)
                        setLoading(false)
                        return
                    }
                }
            } catch (e) {
                console.warn("Error parsing cached verse", e)
            }

            // 2. Fetch from Scraper
            try {
                const { text, reference } = await fetchDailyVerse()

                // Fix Duplication: Remove the reference if it appears in the text
                // e.g. "Text... Joel 3:10" -> "Text..."
                // We use a flexible regex replace or simple string replace
                const cleanText = text.replace(reference, "").trim()
                // Also remove quotes if they wrap the entire text, though cleaner not to if stylistic
                // Let's just remove the reference.

                // Parse Reference (e.g. "Joel 3:10")
                const match = reference.match(/(.+)\s+(\d+):(\d+)/)

                let newVerse: Verse

                if (match) {
                    newVerse = {
                        book: {
                            name: match[1].trim(),
                            author: "",
                            group: ""
                        },
                        chapter: parseInt(match[2]),
                        number: parseInt(match[3]),
                        text: cleanText
                    }
                } else {
                    newVerse = {
                        book: { name: reference, author: "", group: "" },
                        chapter: 0,
                        number: 0,
                        text: cleanText
                    }
                }

                setVerse(newVerse)

                // 3. Save Cache
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    date: today,
                    verse: newVerse
                }))

            } catch (error) {
                console.error("Error fetching verse:", error)
                // Fallback verse
                setVerse({
                    book: { name: "Salmos", author: "Davi", group: "Poéticos" },
                    chapter: 23,
                    number: 1,
                    text: "O Senhor é o meu pastor; de nada terei falta."
                })
            } finally {
                setLoading(false)
            }
        }

        fetchVerse()
    }, [])

    if (loading) return <div className="h-32 animate-pulse bg-muted rounded-xl" />

    if (!verse) return null

    return (
        <div className="relative overflow-hidden rounded-xl bg-linear-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-lg">
            <Quote className="absolute top-4 right-4 h-12 w-12 text-white/20" />
            <div className="relative z-10 space-y-4">
                <p className="font-serif text-lg leading-relaxed md:text-xl italic line-clamp-4">
                    "{verse.text}"
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-white/90">
                    <span>{verse.book.name}{verse.chapter > 0 && ` ${verse.chapter}:${verse.number}`}</span>
                </div>
            </div>
        </div>
    )
}
