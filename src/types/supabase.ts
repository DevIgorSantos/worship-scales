export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            acknowledgments: {
                Row: {
                    id: string
                    member_id: string
                    service_id: string
                    viewed_at: string
                }
                Insert: {
                    id?: string
                    member_id: string
                    service_id: string
                    viewed_at?: string
                }
                Update: {
                    id?: string
                    member_id?: string
                    service_id?: string
                    viewed_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "acknowledgments_member_id_fkey"
                        columns: ["member_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "acknowledgments_service_id_fkey"
                        columns: ["service_id"]
                        isOneToOne: false
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                ]
            }
            lyrics: {
                Row: {
                    id: string
                    song_id: string
                    content: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    song_id: string
                    content: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    song_id?: string
                    content?: Json
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "lyrics_song_id_fkey"
                        columns: ["song_id"]
                        isOneToOne: false
                        referencedRelation: "songs"
                        referencedColumns: ["id"]
                    }
                ]
            }
            profiles: {
                Row: {
                    assigned_instruments: string[] | null
                    avatar_url: string | null
                    created_at: string
                    full_name: string | null
                    id: string
                    role: Database["public"]["Enums"]["user_role"] | null
                }
                Insert: {
                    assigned_instruments?: string[] | null
                    avatar_url?: string | null
                    created_at?: string
                    full_name?: string | null
                    id: string
                    role?: Database["public"]["Enums"]["user_role"] | null
                }
                Update: {
                    assigned_instruments?: string[] | null
                    avatar_url?: string | null
                    created_at?: string
                    full_name?: string | null
                    id: string
                    role?: Database["public"]["Enums"]["user_role"] | null
                }
                Relationships: []
            }
            service_songs: {
                Row: {
                    id: string
                    order_index: number
                    service_id: string
                    song_id: string
                    key: string | null
                }
                Insert: {
                    id?: string
                    order_index?: number
                    service_id: string
                    song_id: string
                    key?: string | null
                }
                Update: {
                    id?: string
                    order_index?: number
                    service_id?: string
                    song_id?: string
                    key?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "service_songs_service_id_fkey"
                        columns: ["service_id"]
                        isOneToOne: false
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "service_songs_song_id_fkey"
                        columns: ["song_id"]
                        isOneToOne: false
                        referencedRelation: "songs"
                        referencedColumns: ["id"]
                    },
                ]
            }
            service_team: {
                Row: {
                    id: string
                    instrument: string
                    member_id: string
                    service_id: string
                    status: "confirmed" | "unavailable" | "substituted"
                    role_type: "primary" | "backup"
                }
                Insert: {
                    id?: string
                    instrument: string
                    member_id: string
                    service_id: string
                    status?: "confirmed" | "unavailable" | "substituted"
                    role_type?: "primary" | "backup"
                }
                Update: {
                    id?: string
                    instrument?: string
                    member_id?: string
                    service_id?: string
                    status?: "confirmed" | "unavailable" | "substituted"
                    role_type?: "primary" | "backup"
                }
                Relationships: [
                    {
                        foreignKeyName: "service_team_member_id_fkey"
                        columns: ["member_id"]
                        isOneToOne: false
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "service_team_service_id_fkey"
                        columns: ["service_id"]
                        isOneToOne: false
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                ]
            }
            services: {
                Row: {
                    created_at: string
                    date: string
                    description: string | null
                    id: string
                    time: string
                    type: Database["public"]["Enums"]["service_type"]
                }
                Insert: {
                    created_at?: string
                    date: string
                    description?: string | null
                    id?: string
                    time: string
                    type?: Database["public"]["Enums"]["service_type"]
                }
                Update: {
                    created_at?: string
                    date?: string
                    description?: string | null
                    id?: string
                    time?: string
                    type?: Database["public"]["Enums"]["service_type"]
                }
                Relationships: []
            }
            songs: {
                Row: {
                    artist: string | null
                    created_at: string
                    id: string
                    link: string | null
                    title: string
                    type: Database["public"]["Enums"]["song_type"]
                    tone: string | null
                }
                Insert: {
                    artist?: string | null
                    created_at?: string
                    id?: string
                    link?: string | null
                    title: string
                    type: Database["public"]["Enums"]["song_type"]
                    tone?: string | null
                }
                Update: {
                    artist?: string | null
                    created_at?: string
                    id?: string
                    link?: string | null
                    title?: string
                    type?: Database["public"]["Enums"]["song_type"]
                    tone?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            perform_substitution: {
                Args: {
                    unavailable_team_id: string
                    backup_team_id: string | null
                }
                Returns: void
            }
        }
        Enums: {
            service_type:
            | "Tuesday"
            | "Thursday"
            | "Sunday School"
            | "Sunday Service"
            | "Special"
            | "Rehearsal"
            song_type: "Harpa Cristã" | "Louvor"
            user_role: "admin" | "member"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}
