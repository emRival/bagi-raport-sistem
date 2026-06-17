import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "./dialog"
import { Button } from "./button"
import { AlertTriangle } from "lucide-react"

export function AlertDialog({ 
    open, 
    onOpenChange, 
    title = "Apakah Anda yakin?", 
    description = "Tindakan ini tidak dapat dibatalkan.", 
    cancelText = "Batal", 
    confirmText = "Hapus", 
    onConfirm, 
    variant = "destructive",
    loading = false 
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] animate-in fade-in zoom-in-95 duration-200">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-full ${variant === 'destructive' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                    </div>
                    <DialogDescription className="text-slate-500 font-medium leading-relaxed">
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0 mt-4">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                        className="font-bold"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant={variant === 'destructive' ? 'destructive' : 'default'}
                        onClick={async () => {
                            await onConfirm()
                            onOpenChange(false)
                        }}
                        loading={loading}
                        className="font-black px-6"
                    >
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
