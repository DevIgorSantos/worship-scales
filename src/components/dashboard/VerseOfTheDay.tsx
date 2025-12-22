import { useEffect, useState } from "react"
import { Quote } from "lucide-react"

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
            try {
                // Fetch random verse from NVI version
                const res = await fetch("https://www.abibliadigital.com.br/api/verses/nvi/random")
                if (!res.ok) throw new Error("Failed to fetch")
                const data = await res.json()
                setVerse(data)
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
                    <span>{verse.book.name} {verse.chapter}:{verse.number}</span>
                </div>
            </div>
        </div>
    )
}
