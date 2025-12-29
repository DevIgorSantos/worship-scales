
import { useState } from "react"
import { Camera, Loader2, ZoomIn, X, Check } from "lucide-react"
import Cropper from "react-easy-crop"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import getCroppedImg from "@/lib/cropImage"

interface AvatarUploadProps {
    userId: string
    currentAvatarUrl: string | null
    onAvatarUpdate: (newUrl: string) => void
    editable?: boolean
    nameFallback?: string
}

export default function AvatarUpload({ userId, currentAvatarUrl, onAvatarUpdate, editable = true, nameFallback = "ME" }: AvatarUploadProps) {
    const [uploading, setUploading] = useState(false)
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
    const [isCropperOpen, setIsCropperOpen] = useState(false)

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const imageDataUrl = await readFile(file)
            setImageSrc(imageDataUrl as string)
            setIsCropperOpen(true)
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
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels)
            if (!croppedImageBlob) throw new Error("Could not crop image")

            const fileName = `${userId}/${Date.now()}.jpg`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, croppedImageBlob)

            if (uploadError) throw uploadError

            const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
            if (!data.publicUrl) throw new Error("Could not get public URL")

            const { error: updateError } = await supabase.from("profiles").update({
                id: userId,
                avatar_url: data.publicUrl
            }).eq("id", userId)

            if (updateError) throw updateError

            onAvatarUpdate(data.publicUrl)
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
        <>
            <div className="relative group cursor-pointer">
                <Avatar className="w-32 h-32 border-4 border-background shadow-xl">
                    <AvatarImage src={currentAvatarUrl || ""} className="object-cover" />
                    <AvatarFallback className="text-4xl bg-muted">
                        {nameFallback.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                {editable && (
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
                )}
            </div>

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
        </>
    )
}
