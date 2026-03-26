import { Button } from '@/components/ui/button'
import { useWorkbench } from '@/components/workbench/WorkbenchContext'
import { X, MapPin } from 'lucide-react'

export function ParcelBanner() {
  const { parcel, clearParcel } = useWorkbench()

  if (!parcel?.id) return null

  return (
    <div className="flex items-center justify-between rounded-md p-3 bg-tf-substrate border border-border/30">
      <div className="flex items-center gap-3">
        <MapPin className="w-4 h-4 text-suite-dais" />
        <div>
          <div className="text-sm font-medium text-foreground">{parcel.parcelNumber || parcel.id}</div>
          <div className="text-xs text-muted-foreground">{parcel.address || 'Unknown address'}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => clearParcel()} className="h-7">
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}

export default ParcelBanner
