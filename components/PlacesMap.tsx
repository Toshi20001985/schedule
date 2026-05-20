'use client'

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface PlacePin {
  id: string
  name: string
  category: string
  is_visited: boolean
  latitude: number
  longitude: number
}

// divIcon でカスタムマーカー（webpack の default icon 破損問題を回避）
function createIcon(isVisited: boolean) {
  const color = isVisited ? '#4A7C59' : '#6D5BD0'
  return L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};
      border:2.5px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.28);
    "></div>`,
    iconSize:    [14, 14],
    iconAnchor:  [7, 7],
    popupAnchor: [0, -10],
  })
}

const visitedIcon  = createIcon(true)
const wishlistIcon = createIcon(false)

// 地図タップで座標を返すハンドラー（editable モード用）
function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) { onMapClick(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

interface Props {
  places: PlacePin[]
  height: string
  zoom?: number
  editable?: boolean
  onMapClick?: (lat: number, lon: number) => void
}

export default function PlacesMap({ places, height, zoom = 5, editable = false, onMapClick }: Props) {
  // 中心: 場所の重心 または 日本中央
  const center: [number, number] =
    places.length > 0
      ? [
          places.reduce((s, p) => s + p.latitude,  0) / places.length,
          places.reduce((s, p) => s + p.longitude, 0) / places.length,
        ]
      : [36.2048, 138.2529]

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%' }}
      zoomControl={false}
    >
      {/* Carto Light タイル（OSM データ、無料） */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      {editable && onMapClick && <ClickHandler onMapClick={onMapClick} />}
      {places.map(place => (
        <Marker
          key={place.id}
          position={[place.latitude, place.longitude]}
          icon={place.is_visited ? visitedIcon : wishlistIcon}
        >
          <Popup>
            <div style={{ minWidth: '120px', fontFamily: 'system-ui, sans-serif' }}>
              <p style={{ fontWeight: 600, marginBottom: '4px', fontSize: '14px', color: '#1A1A1A' }}>
                {place.name}
              </p>
              <p style={{ fontSize: '12px', color: '#737373', marginBottom: '6px' }}>
                {place.category}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: place.is_visited ? '#4A7C59' : '#6D5BD0',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: '11px', color: place.is_visited ? '#4A7C59' : '#6D5BD0' }}>
                  {place.is_visited ? '訪問済み' : '行きたい'}
                </span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
