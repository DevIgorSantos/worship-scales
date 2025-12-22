import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/types/supabase"

type ServiceType = Database["public"]["Enums"]["service_type"]
type Service = Database["public"]["Tables"]["services"]["Row"]

interface ServiceDialogProps {
    onUpdate: () => void
    serviceToEdit?: Service
    trigger?: React.ReactNode
}

export function ServiceDialog({ onUpdate, serviceToEdit, trigger }: ServiceDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [date, setDate] = useState("")
    const [type, setType] = useState<ServiceType>("Sunday Service")
    const [time, setTime] = useState("18:30")
    const [description, setDescription] = useState("")

    useEffect(() => {
        if (open) {
            if (serviceToEdit) {
                setDate(serviceToEdit.date)
                setTime(serviceToEdit.time)
                setDescription(serviceToEdit.description || "")
                // Heuristic to set type if description matches enum, or default custom logic
                // If we saved type in description previously, we can try to restore it,
                // otherwise defaulting to Sunday Service is fine or mapped
            } else {
                // Reset for create mode
                // setDate("") // Don't reset date/time blindly if we want to default to today/next sunday maybe?
                // Keeping clean start:
                setDate("")
                setDescription("")
                setTime("18:30")
            }
        }
    }, [open, serviceToEdit])

    const handleTypeChange = (value: ServiceType) => {
        setType(value)
        switch (value) {
            case "Tuesday":
            case "Thursday":
                setTime("19:30")
                break
            case "Sunday School":
                setTime("09:00")
                break
            case "Sunday Service":
                setTime("18:30")
                break
            default:
                break
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload = {
                date,
                time,
                type,
                description: description || undefined
            }

            let error;

            if (serviceToEdit) {
                const { error: updateError } = await supabase
                    .from("services")
                    .update(payload)
                    .eq("id", serviceToEdit.id)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from("services")
                    .insert(payload)
                error = insertError
            }

            if (error) throw error

            setOpen(false)
            onUpdate()
            if (!serviceToEdit) {
                setDate("")
                setDescription("")
            }
        } catch (error) {
            console.error(error)
            alert(serviceToEdit ? "Erro ao atualizar culto" : "Erro ao criar culto")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button>Agendar Culto</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{serviceToEdit ? "Editar Culto" : "Novo Culto"}</DialogTitle>
                    <DialogDescription>
                        {serviceToEdit ? "Atualize as informações do culto." : "Agende um novo culto."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">
                            Data
                        </Label>
                        <Input
                            id="date"
                            type="date"
                            className="col-span-3"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>
                    {/* Only show Quick Type selector if Creating or if needed. For Edit, maybe just show fields?
                        Let's keep it available to quickly set time/desc defaults.
                     */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Tipo
                        </Label>
                        <Select onValueChange={(val: ServiceType) => handleTypeChange(val)} value={type}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Predefinição" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Sunday School">Escola Dominical</SelectItem>
                                <SelectItem value="Sunday Service">Culto de Domingo</SelectItem>
                                <SelectItem value="Tuesday">Terça-feira</SelectItem>
                                <SelectItem value="Thursday">Quinta-feira</SelectItem>
                                <SelectItem value="Special">Especial</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="time" className="text-right">
                            Hora
                        </Label>
                        <Input
                            id="time"
                            type="time"
                            className="col-span-3"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="desc" className="text-right">
                            Obs
                        </Label>
                        <Input
                            id="desc"
                            className="col-span-3"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ex: Santa Ceia"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : (serviceToEdit ? "Salvar Alterações" : "Agendar")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
