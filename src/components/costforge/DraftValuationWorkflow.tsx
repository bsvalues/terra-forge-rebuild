import React, { useState } from 'react'
import useSaveCalcTrace from '../../hooks/useCostForgeMutations'
import { calcRCNLD } from '@/services/costforgeConnector'
import type { CostForgeCalcInput } from '@/services/costforgeConnector'

const BENTON_COUNTY_ID = "842a6c54-c7c0-4b2d-aa43-0e3ba63fa57d";

type Props = { parcelId?: string | number }

export default function DraftValuationWorkflow({ parcelId }: Props) {
  const [improvementType, setImprovementType] = useState<string>('')
  const [area, setArea] = useState<number>(0)
  const [yearBuilt, setYearBuilt] = useState<number>(2000)

  const saveMutation = useSaveCalcTrace()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const input: CostForgeCalcInput = {
      lrsn: null,
      pin: null,
      county_id: BENTON_COUNTY_ID,
      imprv_det_type_cd: improvementType || null,
      yr_built: yearBuilt,
      area_sqft: area,
      condition_code: null,
      construction_class_raw: null,
      use_code: null,
      section_id: null,
      occupancy_code: null,
      is_residential: true,
    }

    try {
      const result = await calcRCNLD(input)
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
      {saveMutation.isPending && <div>Saving...</div>}
      {saveMutation.isError && <div style={{ color: 'red' }}>Error saving trace</div>}
      {saveMutation.isSuccess && <div style={{ color: 'green' }}>Saved</div>}
    </form>
  )
}
