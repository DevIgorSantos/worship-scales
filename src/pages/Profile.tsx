import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Camera, LogOut, Loader2, Save, ZoomIn, X, Check } from "lucide-react"
import Cropper from "react-easy-crop"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import getCroppedImg from "@/lib/cropImage"

export default function Profile() {
    const { user, profile, signOut } = useAuth()
    const navigate = useNavigate()

    // Profile State
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

    // Cropper State
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
    const [isCropperOpen, setIsCropperOpen] = useState(false)

    useEffect(() => {
        if (profile) {
            setName(profile.full_name || "")
            setAvatarUrl(profile.avatar_url)
        }
    }, [profile])

    const handleSignOut = async () => {
        await signOut()
        navigate("/login")
    }

    const handleUpdateProfile = async () => {
        if (!user) return
        setLoading(true)
        try {
            const { error } = await supabase.from("profiles").update({
                id: user.id,
                full_name: name,
            }).eq("id", user.id)

            if (error) throw error
            alert("Perfil atualizado!")
        } catch (error) {
            console.error("Error updating profile:", error)
            alert("Erro ao atualizar perfil.")
        } finally {
            setLoading(false)
        }
    }

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const imageDataUrl = await readFile(file)
            setImageSrc(imageDataUrl as string)
            setIsCropperOpen(true)
            // Reset input value so we can select same file again if needed
            e.target.value = ""
        }
    }

    const readFile = (file: File) => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.addEventListener("load", () => resolve(reader.result), false)
            reader.readAsDataURL(file)
        })
    }

    const onCropComplete = (_: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }

    const handleUploadCroppedImage = async () => {
        if (!imageSrc || !croppedAreaPixels) return

        try {
            setUploading(true)
            // Await the cropped blob
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)

            if (!croppedImageBlob) throw new Error("Could not crop image")

            const fileName = `${user!.id}/${Date.now()}.jpg`
            const filePath = `${fileName}`

            // Upload to Supabase
            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, croppedImageBlob)

            if (uploadError) throw uploadError

            const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)

            if (!data.publicUrl) throw new Error("Could not get public URL")

            // Update profile
            const { error: updateError } = await supabase.from("profiles").update({
                id: user!.id,
                avatar_url: data.publicUrl
            }).eq("id", user!.id)

            if (updateError) throw updateError

            setAvatarUrl(data.publicUrl)
            setIsCropperOpen(false)
            setImageSrc(null)

        } catch (error: any) {
            console.error("Upload error:", error)
            alert("Erro ao atualizar foto: " + error.message)
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="p-4 flex flex-col items-center gap-6 max-w-md mx-auto pb-24">
            <h1 className="text-2xl font-bold self-start">Meu Perfil</h1>

            {/* Avatar Section */}
            <div className="relative group cursor-pointer">
                <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                    <AvatarImage src={avatarUrl || ""} className="object-cover" />
                    <AvatarFallback className="text-4xl bg-muted">
                        {name?.substring(0, 2).toUpperCase() || "ME"}
                    </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Label htmlFor="avatar-upload" className="cursor-pointer text-white flex flex-col items-center gap-1 w-full h-full justify-center rounded-full">
                        <Camera className="w-6 h-6" />
                        <span className="text-xs">Alterar</span>
                    </Label>
                    <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onFileChange}
                        disabled={uploading}
                    />
                </div>
            </div>

            {/* Profile Info Form */}
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Seu nome"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Função</Label>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-sm font-medium capitalize">
                                {profile?.role || "Membro"}
                            </span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleSignOut}>
                        <LogOut className="w-4 h-4 mr-2" /> Sair
                    </Button>
                    <Button onClick={handleUpdateProfile} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Save className="w-4 h-4 mr-2" /> Salvar
                    </Button>
                </CardFooter>
            </Card>

            {/* Crop Dialog */}
            <Dialog open={isCropperOpen} onOpenChange={setIsCropperOpen}>
                <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Ajustar Foto</DialogTitle>
                    </DialogHeader>

                    <div className="relative w-full h-64 bg-black rounded-md overflow-hidden shrink-0">
                        {imageSrc && (
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        )}
                    </div>

                    <div className="flex items-center space-x-2 py-4">
                        <ZoomIn className="w-4 h-4 text-muted-foreground" />
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.1}
                            onValueChange={(value) => setZoom(value[0])}
                            className="flex-1"
                        />
                    </div>

                    <DialogFooter className="flex gap-2 sm:justify-between">
                        <Button variant="outline" onClick={() => { setIsCropperOpen(false); setImageSrc(null); }}>
                            <X className="w-4 h-4 mr-2" /> Cancelar
                        </Button>
                        <Button onClick={handleUploadCroppedImage} disabled={uploading}>
                            {uploading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4 mr-2" />
                            )}
                            Salvar Foto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
