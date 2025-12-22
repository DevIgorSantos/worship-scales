import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Song = Database["public"]["Tables"]["songs"]["Row"]

interface UseSongsOptions {
    search?: string
    type?: string // 'louvor', 'harpa', 'all'
}

export function useSongs({ search, type = 'all' }: UseSongsOptions = {}) {
    return useQuery({
        queryKey: ['songs', type, search],
        queryFn: async () => {
            let query = supabase.from("songs").select("*").order("title", { ascending: true })

            if (type === "louvor") {
                query = query.eq("type", "Louvor")
            } else if (type === "harpa") {
                query = query.eq("type", "Harpa Cristã")
            }

            if (search) {
                query = query.ilike("title", `%${search}%`)
            }

            const { data, error } = await query

            if (error) {
                console.error("Error fetching songs:", error)
                throw error
            }

            // Client-side sort to handle "1 - Title" vs "10 - Title" correctly
            return (data as Song[]).sort((a, b) => {
                return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
            })
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    })
}
