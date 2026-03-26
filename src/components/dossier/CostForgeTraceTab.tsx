import { useQuery } from '@tanstack/react-query'
import { getCalcTrace } from '@/services/costforgeConnector'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export function CostForgeTraceTab({ parcelId }: { parcelId: string | null }) {
  const { data: traces = [], isLoading } = useQuery({
    queryKey: ['costforge-trace', parcelId],
    queryFn: async () => {
      if (!parcelId) return []
      return getCalcTrace(parcelId)
    },
    enabled: !!parcelId,
  })

  if (!parcelId) {
    return <div className="text-sm text-muted-foreground">Select a parcel to view CostForge traces.</div>
  }

  return (
    <Card className="material-bento border-border/50">
      <CardHeader>
        <CardTitle className="text-sm">CostForge Calc Trace</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48">
          {isLoading ? (
            <div className="text-xs text-muted-foreground">Loading traces…</div>
          ) : traces.length === 0 ? (
            <div className="text-xs text-muted-foreground">No traces available for this parcel.</div>
          ) : (
            <div className="space-y-2">
              {traces.map((t: any) => (
                <div key={t.id} className="p-2 rounded bg-tf-substrate border border-border/20 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Calc Year: {t.calc_year || '—'}</div>
                    <div className="text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-sm mt-1">RCNLD: {t.computed_rcnld ?? '—'}</div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default CostForgeTraceTab
