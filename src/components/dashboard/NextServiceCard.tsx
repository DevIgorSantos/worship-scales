import { useEffect, useState } from "react"
import { Calendar, Clock, ArrowRight } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Database } from "@/types/supabase"
import { Link } from "react-router-dom"

type Service = Database["public"]["Tables"]["services"]["Row"]

export function NextServiceCard() {
    const [nextService, setNextService] = useState<Service | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchNextService = async () => {
            const today = new Date().toISOString().split('T')[0]

            // Fetch next service (date >= today) order by date ASC
            const { data, error } = await supabase
                .from("services")
                .select("*")
                .gte("date", today)
                .order("date", { ascending: true })
                .order("time", { ascending: true })
                .limit(1)
                .single()

            if (!error && data) {
                setNextService(data)
            }
            setLoading(false)
        }

        fetchNextService()
    }, [])

    if (loading) return <div className="h-40 animate-pulse bg-muted rounded-xl" />

    if (!nextService) {
        return (
            <Card className="border-dashed">
                <CardHeader>
                    <CardTitle className="text-lg">Próximo Culto</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">Nenhum culto agendado para os próximos dias.</p>
                    <Button asChild variant="outline" className="w-full">
                        <Link to="/escalas">Ver Agenda Completa</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    const getServiceTypeLabel = (type: string) => {
        switch (type) {
            case "Sunday School": return "Escola Bíblica Dominical";
            case "Sunday Service": return "Culto de Domingo";
            case "Tuesday": return "Culto de Terça-feira";
            case "Thursday": return "Culto de Quinta-feira";
            case "Special": return "Especial";
            default: return type;
        }
    }

    // ...

    return (
        <Card className="border-l-4 border-l-primary overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Calendar className="w-24 h-24" />
            </div>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Próximo Culto
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <h3 className="text-xl font-bold flex flex-col gap-1 items-start">
                        <span>{getServiceTypeLabel(nextService.type)}</span>
                        {nextService.description && (
                            <span className="text-sm font-normal text-muted-foreground">
                                {nextService.description}
                            </span>
                        )}
                    </h3>
                    <p className="text-muted-foreground capitalize mt-1">
                        {format(new Date(nextService.date + "T" + nextService.time), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                </div>

                <div className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded-md w-fit">
                    <Clock className="w-4 h-4" />
                    <span className="font-semibold">{nextService.time.slice(0, 5)}</span>
                </div>

                <Button asChild className="w-full group">
                    <Link to={`/escalas/${nextService.id}`}>
                        Ver Detalhes
                        <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}
