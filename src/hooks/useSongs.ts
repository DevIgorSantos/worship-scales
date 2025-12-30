import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type Song = Database["public"]["Tables"]["songs"]["Row"]

export interface UseSongsOptions {
    search?: string
    type?: string // 'louvor', 'harpa', 'all'
    page?: number
    limit?: number
}

export interface SongsResponse {
    data: Song[]
    count: number
}

export function useSongs({ search, type = 'all', page, limit }: UseSongsOptions = {}) {
    return useQuery({
        queryKey: ['songs', type, search, page, limit],
        queryFn: async () => {
            // Fetch all matching songs without range to verify sorting
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

            let allSongs = (data as Song[]) || []

            // Client-side sort to handle "1 - Title" vs "10 - Title" correctly
            allSongs.sort((a, b) => {
                return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
            })

            const totalCount = allSongs.length

            // Apply pagination on the client side
            let paginatedData = allSongs
            if (page !== undefined && limit !== undefined) {
                const from = (page - 1) * limit
                const to = from + limit
                paginatedData = allSongs.slice(from, to)
            }

            return {
                data: paginatedData,
                count: totalCount
            }
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        placeholderData: keepPreviousData
    })
}
