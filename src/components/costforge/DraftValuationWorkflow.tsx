import React, { useState } from 'react'
import useSaveCalcTrace from '../../hooks/useCostForgeMutations'
import { calcRCNLD } from '@/services/costforgeConnector'

type Props = { parcelId?: string | number }

export default function DraftValuationWorkflow({ parcelId }: Props) {
  const [improvementType, setImprovementType] = useState<string>('')
  const [area, setArea] = useState<number>(0)
  const [yearBuilt, setYearBuilt] = useState<number>(2000)

  const saveMutation = useSaveCalcTrace()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const input = {
      parcel_id: parcelId ?? null,
      improvement_type: improvementType,
      area_sqft: area,
      yr_built: yearBuilt,
      county_id: 'Benton',
      is_residential: true,
    }

    // compute rcnld using CostForge engine
    try {
      const result = await calcRCNLD(input as any)
      const trace = {
        parcel_id: parcelId ?? null,
        improvement_type: improvementType,
        area,
        year_built: yearBuilt,
        computed_rcnld: result.rcnld ?? null,
        calc_year: new Date().getFullYear(),
        created_at: new Date().toISOString(),
      }
      saveMutation.mutate(trace)
    } catch (err) {
      console.error('calcRCNLD failed', err)
      saveMutation.mutate({
        parcel_id: parcelId ?? null,
        improvement_type: improvementType,
        area,
        year_built: yearBuilt,
        computed_rcnld: null,
        calc_year: new Date().getFullYear(),
        created_at: new Date().toISOString(),
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 12 }}>
      <div style={{ marginBottom: 8 }}>
        <label>Improvement Type</label>
        <input value={improvementType} onChange={e => setImprovementType(e.target.value)} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Area (sqft)</label>
        <input type="number" value={area} onChange={e => setArea(Number(e.target.value))} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label>Year Built</label>
        <input type="number" value={yearBuilt} onChange={e => setYearBuilt(Number(e.target.value))} />
      </div>
      <button type="submit">Save Draft Trace</button>
      {saveMutation.isLoading && <div>Saving...</div>}
      {saveMutation.isError && <div style={{ color: 'red' }}>Error saving trace</div>}
      {saveMutation.isSuccess && <div style={{ color: 'green' }}>Saved</div>}
    </form>
  )
}
