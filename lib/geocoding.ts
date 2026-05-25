/**
 * Nominatim (OpenStreetMap) を使って地名→緯度経度変換
 *
 * 利用規約: https://operations.osmfoundation.org/policies/nominatim/
 * - 1 リクエスト/秒 の制限あり
 * - バックフィル時は必ず 1 秒以上待機してから次のリクエストを送ること
 */

export interface GeocodeResult {
  lat: number
  lon: number
  displayName: string
}

// 検索ノイズになる一般語（地名ではない語）
const NOISE_WORDS = [
  '旅行', '観光', 'デート', '散歩', 'ドライブ', '出張', 'お出かけ',
  'ツアー', '巡り', 'めぐり', '訪問', 'お泊まり', 'お宿',
  // 英語
  'trip', 'travel', 'tour', 'visit', 'vacation', 'holiday',
  'getaway', 'journey', 'sightseeing',
]

// 明示的に海外を示すキーワード
const OVERSEAS_KEYWORDS = [
  'ハワイ', 'ニューヨーク', 'ロサンゼルス', 'パリ', 'ロンドン',
  'バリ', '台湾', '韓国', 'タイ', '中国', '香港', 'シンガポール',
  'カナダ', 'オーストラリア', 'インド', 'イタリア', 'スペイン',
  'ドイツ', 'フランス', 'スイス', 'アメリカ',
  'hawaii', 'new york', 'london', 'paris', 'singapore', 'taipei',
  'seoul', 'bangkok', 'bali',
]

/** クエリから旅行などのノイズ語を除去 */
function cleanQuery(query: string): string {
  let cleaned = query.trim()
  for (const word of NOISE_WORDS) {
    const regex = new RegExp(`\\s*${word}\\s*`, 'gi')
    cleaned = cleaned.replace(regex, ' ').trim()
  }
  return cleaned.replace(/\s+/g, ' ').trim()
}

/** Nominatim に単一クエリを送信し結果配列を返す */
async function searchNominatim(query: string): Promise<NominatimResult[]> {
  if (!query || query.trim().length === 0) return []
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      limit: '5',
      'accept-language': 'ja',
      addressdetails: '1',
    })
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { 'User-Agent': 'Layover-App/1.0', 'Accept-Language': 'ja,en' } },
    )
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  importance?: string
  address?: { country_code?: string }
}

/** 結果をスコアリングして最も適切な1件を返す */
function scoreResults(results: NominatimResult[], originalQuery: string): NominatimResult | null {
  if (results.length === 0) return null

  const isJapaneseQuery = /[\u3040-\u30FF\u4E00-\u9FFF]/.test(originalQuery)
  const lowerQuery = originalQuery.toLowerCase()
  const isOverseasQuery = OVERSEAS_KEYWORDS.some(k => lowerQuery.includes(k.toLowerCase()))

  const scored = results.map(item => {
    let score = parseFloat(item.importance ?? '0')
    const cc = item.address?.country_code

    if (isJapaneseQuery && !isOverseasQuery && cc === 'jp') score += 2.0  // 日本語クエリ→日本を強く優先
    if (isOverseasQuery && cc !== 'jp')                      score += 0.5  // 海外キーワードあり→海外を優先
    if (isJapaneseQuery && !isOverseasQuery && cc !== 'jp')  score -= 0.5  // 日本語なのに海外→減点

    return { item, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0].item
}

/** 結果の信頼度が低いかチェック（低い場合は別クエリでリトライ） */
function isLowConfidence(result: NominatimResult, originalQuery: string): boolean {
  const importance = parseFloat(result.importance ?? '0')
  if (importance < 0.3) return true

  // 日本語クエリなのに海外結果がヒット → 信頼度低
  const isJapaneseQuery = /[\u3040-\u30FF\u4E00-\u9FFF]/.test(originalQuery)
  const isOverseasQuery = OVERSEAS_KEYWORDS.some(k =>
    originalQuery.toLowerCase().includes(k.toLowerCase()),
  )
  if (isJapaneseQuery && !isOverseasQuery) {
    const cc = result.address?.country_code
    if (cc && cc !== 'jp') return true
  }

  return false
}

/**
 * メインのジオコーディング関数
 * Step 1: 元クエリで検索
 * Step 2: ノイズ語除去クエリで再検索
 * Step 3: 先頭の単語だけで再検索
 */
export async function geocode(query: string): Promise<GeocodeResult | null> {
  if (!query || query.trim().length === 0) return null
  // Supabase 未設定（デモモード）では座標を保存できないためスキップ
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null

  // Step 1: 元のクエリで試す
  let results = await searchNominatim(query)
  let best = scoreResults(results, query)

  // Step 2: ノイズ語を除去して再試行
  if (!best || isLowConfidence(best, query)) {
    const cleaned = cleanQuery(query)
    if (cleaned && cleaned !== query) {
      await new Promise(r => setTimeout(r, 1100))  // Nominatim レート制限
      results = await searchNominatim(cleaned)
      const cleanedBest = scoreResults(results, cleaned)
      if (cleanedBest) best = cleanedBest
    }
  }

  // Step 3: 最初の単語だけで再試行
  if (!best) {
    const firstWord = query.split(/[\s,、]/)[0]
    if (firstWord && firstWord !== query && firstWord.trim().length > 0) {
      await new Promise(r => setTimeout(r, 1100))
      results = await searchNominatim(firstWord)
      best = scoreResults(results, firstWord)
    }
  }

  if (!best) return null

  return {
    lat: parseFloat(best.lat),
    lon: parseFloat(best.lon),
    displayName: best.display_name,
  }
}
