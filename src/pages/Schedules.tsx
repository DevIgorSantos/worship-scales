import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ServiceDialog } from "@/components/services/ServiceDialog"
import type { Database } from "@/types/supabase"

type Service = Database["public"]["Tables"]["services"]["Row"]

export default function Schedules() {
    const navigate = useNavigate()
    const { isAdmin } = useAuth()
    const [services, setServices] = useState<Service[]>([])
    const [loading, setLoading] = useState(true)

    const fetchServices = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from("services")
            .select("*")
            .order("date", { ascending: true })
            .order("time", { ascending: true })
        // Filter for future dates? Or all? Let's show all for now or upcoming.
        // .gte("date", new Date().toISOString()) 

        if (error) {
            console.error("Error fetching services:", error)
        } else {
            setServices(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchServices()
    }, [])

    return (
        <div className="p-4 pb-24 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-primary to-cyan-200">
                    Escalas
                </h1>
                {isAdmin && <ServiceDialog onUpdate={fetchServices} />}
            </div>

            {loading ? (
                <p className="text-muted-foreground text-center py-8">Carregando...</p>
            ) : services.length === 0 ? (
                <div className="text-center py-12 border rounded-lg border-dashed">
                    <p className="text-muted-foreground">Nenhum culto agendado.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {/* Upcoming Services */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            Próximos Cultos
                        </h2>
                        {services.filter(s => s.date >= new Date().toISOString().split('T')[0]).length === 0 ? (
                            <p className="text-muted-foreground text-sm italic">Nenhum culto futuro agendado.</p>
                        ) : (
                            <div className="grid gap-4">
                                {services
                                    .filter(s => s.date >= new Date().toISOString().split('T')[0])
                                    .map((service) => (
                                        <ServiceCard key={service.id} service={service} onClick={() => navigate(`/escalas/${service.id}`)} />
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* Past Services */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-5 h-5" />
                            Histórico
                        </h2>
                        {services.filter(s => s.date < new Date().toISOString().split('T')[0]).length === 0 ? (
                            <p className="text-muted-foreground text-sm italic">Nenhum culto realizado.</p>
                        ) : (
                            <div className="grid gap-4 opacity-80">
                                {services
                                    .filter(s => s.date < new Date().toISOString().split('T')[0])
                                    .reverse() // Sort descending (assuming fetch is ascending)
                                    .map((service) => (
                                        <ServiceCard key={service.id} service={service} onClick={() => navigate(`/escalas/${service.id}`)} />
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

const getServiceTypeLabel = (type: string) => {
    switch (type) {
        case "Sunday School": return "Escola Bíblica Dominical";
        case "Sunday Service": return "Culto de Domingo";
        case "Tuesday": return "Culto de Terça-feira";
        case "Thursday": return "Culto de Quinta-feira";
        case "Special": return "Especial";
        case "Rehearsal": return "Ensaio";
        default: return type;
    }
}

function ServiceCard({ service, onClick }: { service: Service, onClick: () => void }) {
    return (
        <Card
            className="border-l-4 border-l-primary hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={onClick}
        >
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex flex-col gap-1 items-start">
                    <div className="flex justify-between w-full items-start">
                        <span>{getServiceTypeLabel(service.type)}</span>
                    </div>
                    {service.description && (
                        <span className="text-sm font-normal text-muted-foreground">
                            {service.description}
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="capitalize">
                        {format(new Date(service.date + "T" + service.time), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{service.time.slice(0, 5)}</span>
                </div>
            </CardContent>
        </Card>
    )
}
