import { useCallback, useEffect, useMemo, useState } from "react"
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { Skeleton } from "@/components/ui/skeleton"
import ErrorState from "@/components/ErrorState"
import { getSupplierLocations } from "@/lib/visualizations"
import { getErrorMessage } from "@/lib/errors"
import type { SupplierLocation, SupplierLocationsData } from "@/lib/types"

interface CountryGroup {
  country: string
  countryName: string | null
  lat: number
  lng: number
  suppliers: SupplierLocation[]
}

function groupByCountry(suppliers: SupplierLocation[]): CountryGroup[] {
  const groups = new Map<string, CountryGroup>()
  for (const s of suppliers) {
    if (!s.locatable || s.lat == null || s.lng == null) continue
    const existing = groups.get(s.country)
    if (existing) {
      existing.suppliers.push(s)
    } else {
      groups.set(s.country, {
        country: s.country,
        countryName: s.countryName,
        lat: s.lat,
        lng: s.lng,
        suppliers: [s],
      })
    }
  }
  return [...groups.values()]
}

function GeographicMap() {
  const [data, setData] = useState<SupplierLocationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      setData(await getSupplierLocations())
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't load supplier locations"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const groups = useMemo(() => (data ? groupByCountry(data.suppliers) : []), [data])

  if (loading) return <Skeleton className="h-[32rem] rounded-xl" />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!data) return null

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Country-level approximation only — every supplier from the same country renders at the
        same point. {data.countriesRepresented} countries represented
        {data.unlocatableCount > 0 && `, ${data.unlocatableCount} supplier(s) without a recognized country code`}.
      </div>
      <div className="h-[32rem] overflow-hidden rounded-xl border border-border">
        <MapContainer center={[20, 0]} zoom={2} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {groups.map((group) => (
            <CircleMarker
              key={group.country}
              center={[group.lat, group.lng]}
              radius={6 + Math.min(group.suppliers.length, 10) * 2}
              pathOptions={{ color: "#4f46e5", fillColor: "#4f46e5", fillOpacity: 0.4 }}
            >
              <Popup>
                <p className="font-medium">
                  {group.countryName || group.country} ({group.suppliers.length})
                </p>
                <ul>
                  {group.suppliers.map((s) => (
                    <li key={s.supplierId}>
                      {s.name} — risk {s.riskScore}
                    </li>
                  ))}
                </ul>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}

export default GeographicMap
