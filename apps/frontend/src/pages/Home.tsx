import { useEffect, useState } from 'react'
import {
  Box, Button, Card, CardBody, CardHeader, Container, Divider, Flex, Heading, Image,
  Input, NumberInput, NumberInputField, Select, Stack, Text, useToast
} from '@chakra-ui/react'

type Game = {
  id: number
  title: string
  platform: string
  released_on?: string | null
  created_at: string
  avg_rating: number
  cover_url?: string | null
}

const apiBase = (import.meta.env.VITE_API_BASE as string) ?? 'http://localhost:4000/api'
const backendBase = apiBase.replace(/\/_?api\/?$/, '/api').replace(/\/api$/, '')

export default function Home() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', platform: '', released_on: '' })
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [sort, setSort] = useState('created_at_desc')
  const toast = useToast()

  const fetchGames = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), sort })
      const res = await fetch(`${apiBase}/games?${params.toString()}`)
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      const data: { items: Game[]; total: number; page: number; limit: number } = await res.json()
      setGames(data.items)
      setTotal(data.total)
    } catch (e: any) {
      setError(e.message ?? 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGames() }, [page, sort])

  const createGame = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setError(null)
    try {
      const payload = { title: form.title, platform: form.platform, released_on: form.released_on || null }
      const res = await fetch(`${apiBase}/games`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      setForm({ title: '', platform: '', released_on: '' })
      await fetchGames()
      toast({ title: '追加しました', status: 'success', duration: 1800 })
    } catch (e: any) {
      setError(e.message ?? 'エラーが発生しました')
      toast({ title: 'エラーが発生しました', description: String(e.message ?? e), status: 'error' })
    }
  }

  return (
    <Container maxW="6xl" px={0}>
      <Stack spacing={6}>
        <Card>
          <CardHeader><Heading size="md">ゲームを追加</Heading></CardHeader>
          <CardBody>
            <Stack as="form" onSubmit={createGame} spacing={4}>
              <Input placeholder="タイトル" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <Input placeholder="プラットフォーム (例: Switch, PS5)" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} required />
              <Input type="date" placeholder="発売日" value={form.released_on} onChange={(e) => setForm({ ...form, released_on: e.target.value })} />
              <Button type="submit" colorScheme="blue">追加</Button>
            </Stack>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Flex align="center" justify="space-between">
              <Heading size="md">ゲーム一覧</Heading>
              <Text color="whiteAlpha.700">全{total}件</Text>
            </Flex>
          </CardHeader>
          <CardBody>
            <Flex gap={4} wrap="wrap" align="center" mb={4}>
              <Box>
                <Text fontSize="sm" color="whiteAlpha.700" mb={1}>ソート</Text>
                <Select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1) }} width="56">
                  <option value="created_at_desc">新着順</option>
                  <option value="created_at_asc">古い順</option>
                  <option value="title_asc">タイトル昇順</option>
                  <option value="title_desc">タイトル降順</option>
                  <option value="avg_rating_desc">平均スコア高い順</option>
                  <option value="avg_rating_asc">平均スコア低い順</option>
                </Select>
              </Box>
            </Flex>

            {loading && <Text color="whiteAlpha.700">読み込み中...</Text>}
            {error && <Text color="red.300">{error}</Text>}
            {!loading && games.length === 0 && <Text color="whiteAlpha.700">まだ登録がありません。</Text>}

            <Stack spacing={4}>
              {games.map((g) => (
                <Card key={g.id} variant="outline">
                  <CardBody>
                    <Flex gap={6} align={{ base: 'stretch', md: 'flex-start' }} justify="space-between" direction={{ base: 'column', md: 'row' }}>
                      <Box display="flex" gap={4} alignItems="flex-start">
                        {g.cover_url ? (
                          <Image src={`${backendBase}/api/games/${g.id}/cover?size=thumb`} alt={`${g.title} cover`} borderRadius="md" boxSize="120px" objectFit="cover" loading="lazy" />
                        ) : (
                          <Box boxSize="120px" bg="gray.700" borderRadius="md" />
                        )}
                        <Box>
                          <Heading size="md" mb={1}>{g.title}</Heading>
                          <Text color="whiteAlpha.800">{g.platform} ・ 平均スコア: {g.avg_rating.toFixed(2)}</Text>
                          {g.released_on && <Text fontSize="sm" color="whiteAlpha.600">発売日: {g.released_on}</Text>}
                        </Box>
                      </Box>
                      <Box>
                        <ReviewBox gameId={g.id} onPosted={fetchGames} />
                        <CoverUpload tokenKey="access_token" gameId={g.id} coverUrl={g.cover_url || null} onChanged={fetchGames} />
                      </Box>
                    </Flex>
                  </CardBody>
                </Card>
              ))}
            </Stack>

            <Divider my={4} />
            <Flex gap={3} align="center">
              <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} isDisabled={page <= 1}>前へ</Button>
              <Text>ページ {page}</Text>
              <Button variant="outline" onClick={() => setPage((p) => p + 1)} isDisabled={page * limit >= total}>次へ</Button>
            </Flex>
          </CardBody>
        </Card>
      </Stack>
    </Container>
  )
}

function ReviewBox({ gameId, onPosted }: { gameId: number; onPosted: () => void }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${apiBase}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ game_id: gameId, rating, comment: comment || null })
      })
      if (res.status === 401) {
        localStorage.removeItem('access_token')
        throw new Error('認証が必要です。再ログインしてください')
      }
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
    <Box as="form" onSubmit={submit} width={{ base: '100%', md: 80 }}>
      <Stack spacing={2}>
        {!token && <Text fontSize="sm" color="whiteAlpha.700">レビュー投稿にはログインが必要です</Text>}
        <Text fontSize="sm" color="whiteAlpha.700">スコア</Text>
        <NumberInput min={1} max={5} value={rating} onChange={(_, n) => setRating(Number.isNaN(n) ? 1 : n)} isDisabled={!token}>
          <NumberInputField />
        </NumberInput>
        <Input placeholder="コメント（任意）" value={comment} onChange={(e) => setComment(e.target.value)} isDisabled={!token} />
        <Button type="submit" colorScheme="blue" isLoading={busy} isDisabled={!token}>レビュー投稿</Button>
        {error && <Text color="red.300" fontSize="sm">{error}</Text>}
      </Stack>
    </Box>
  )
}

function CoverUpload({ tokenKey, gameId, coverUrl, onChanged }: { tokenKey: string; gameId: number; coverUrl: string | null; onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const toast = useToast()
  const token = typeof window !== 'undefined' ? localStorage.getItem(tokenKey) : null

  const upload = async () => {
    if (!file || !token) return
    setBusy(true)
    setProgress(0)
    try {
      const form = new FormData()
      form.append('file', file)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', `${apiBase}/games/${gameId}/cover`)
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)) }
        xhr.onload = () => {
          if (xhr.status === 401) { localStorage.removeItem('access_token'); reject(new Error('認証が必要です。再ログインしてください')); return }
          if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error(`HTTP ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('network error'))
        xhr.send(form)
      })
      setFile(null)
      onChanged()
      toast({ title: 'カバー画像を更新しました', status: 'success' })
    } catch (e: any) {
      toast({ title: 'アップロードに失敗', description: String(e.message ?? e), status: 'error' })
    } finally { setBusy(false); setProgress(0) }
  }

  const remove = async () => {
    if (!token) return
    setBusy(true)
    try {
      const res = await fetch(`${apiBase}/games/${gameId}/cover`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) { localStorage.removeItem('access_token'); throw new Error('認証が必要です。再ログインしてください') }
      if (!res.ok && res.status !== 204) throw new Error(`Failed: ${res.status}`)
      setFile(null)
      onChanged()
      toast({ title: 'カバー画像を削除しました', status: 'success' })
    } catch (e: any) {
      toast({ title: '削除に失敗', description: String(e.message ?? e), status: 'error' })
    } finally { setBusy(false) }
  }

  if (!token) return null

  return (
    <Stack mt={4} spacing={2}>
      <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      {progress > 0 && <Box><Box as='div' bg='blue.500' height='2' width={`${progress}%`} borderRadius='sm' /></Box>}
      <Flex gap={2} wrap="wrap">
        <Button size="sm" onClick={upload} isDisabled={!file} isLoading={busy} colorScheme="blue">カバーをアップロード</Button>
        {coverUrl && (
          <Button size="sm" onClick={remove} variant="outline" isLoading={busy} colorScheme="red">カバーを削除</Button>
        )}
      </Flex>
    </Stack>
  )
}

