import { useEffect, useState } from 'react'

type Game = {
  id: number
  title: string
  platform: string
  released_on?: string | null
  created_at: string
  avg_rating: number
}

const apiBase = (import.meta.env.VITE_API_BASE as string) ?? 'http://localhost:4000/api'

export default function App() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', platform: '', released_on: '' })

  const fetchGames = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/games`)
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      const data: Game[] = await res.json()
      setGames(data)
    } catch (e: any) {
      setError(e.message ?? 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGames()
  }, [])

  const createGame = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(null)
    try {
      const payload = {
        title: form.title,
        platform: form.platform,
        released_on: form.released_on || null
      }
      const res = await fetch(`${apiBase}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      setForm({ title: '', platform: '', released_on: '' })
      await fetchGames()
    } catch (e: any) {
      setError(e.message ?? 'エラーが発生しました')
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '24px auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Game Review Hub</h1>
      <p style={{ color: '#666' }}>API: {apiBase}</p>

      <section style={{ margin: '24px 0', padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>ゲームを追加</h2>
        <form onSubmit={createGame} style={{ display: 'grid', gap: 8 }}>
          <input
            placeholder="タイトル"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            placeholder="プラットフォーム (例: Switch, PS5)"
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
            required
          />
          <input
            type="date"
            placeholder="発売日"
            value={form.released_on}
            onChange={(e) => setForm({ ...form, released_on: e.target.value })}
          />
          <button type="submit">追加</button>
        </form>
      </section>

      <section style={{ margin: '24px 0' }}>
        <h2 style={{ marginTop: 0 }}>ゲーム一覧</h2>
        {loading && <p>読み込み中...</p>}
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        {!loading && games.length === 0 && <p>まだ登録がありません。</p>}
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
          {games.map((g) => (
            <li key={g.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{g.title}</strong>
                  <div style={{ color: '#666', fontSize: 14 }}>
                    {g.platform} / 平均スコア: {g.avg_rating.toFixed(2)}
                  </div>
                  {g.released_on && (
                    <div style={{ color: '#666', fontSize: 12 }}>発売日: {g.released_on}</div>
                  )}
                </div>
                <ReviewBox gameId={g.id} onPosted={fetchGames} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function ReviewBox({ gameId, onPosted }: { gameId: number; onPosted: () => void }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, rating, comment: comment || null })
      })
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      setComment('')
      setRating(5)
      onPosted()
    } catch (e: any) {
      setError(e.message ?? 'エラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 6, width: 260 }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        スコア:
        <input
          type="number"
          min={1}
          max={5}
          value={rating}
          onChange={(e) => setRating(parseInt(e.target.value || '1'))}
          style={{ width: 60 }}
        />
      </label>
      <input placeholder="コメント（任意）" value={comment} onChange={(e) => setComment(e.target.value)} />
      <button type="submit" disabled={busy}>レビュー投稿</button>
      {error && <span style={{ color: 'crimson', fontSize: 12 }}>{error}</span>}
    </form>
  )
}

