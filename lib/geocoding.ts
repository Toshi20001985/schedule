/**
 * Nominatim (OpenStreetMap) を使って地名→緯度経度変換
 *
 * 利用規約: https://operations.osmfoundation.org/policies/nominatim/
 * - 1 リクエスト/秒 の制限あり
 * - バックフィル時は必ず 1 秒以上待機してから次のリクエストを送ること
 */
export async function geocode(
  query: string,
): Promise<{ lat: number; lon: number } | null> {
  if (!query.trim()) return null
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'User-Agent': 'Layover-App/1.0' } },
    )
    if (!res.ok) return null
    const data: Array<{ lat: string; lon: string }> = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
    }
    return null
  } catch {
    return null
  }
}
