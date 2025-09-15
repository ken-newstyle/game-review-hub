import { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Badge,
  Button,
  Input,
  Select,
  Stack,
  SimpleGrid,
  NumberInput,
  NumberInputField,
  useToast,
  Card,
  CardHeader,
  CardBody,
  Divider,
} from '@chakra-ui/react'

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

  useEffect(() => {
    fetchGames()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort])

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
      toast({ title: '追加しました', status: 'success', duration: 1800 })
    } catch (e: any) {
      setError(e.message ?? 'エラーが発生しました')
      toast({ title: 'エラーが発生しました', description: String(e.message ?? e), status: 'error' })
    }
  }

  return (
    <Box>
      <Box as="header" bg="gray.900" borderBottomWidth="1px" borderColor="whiteAlpha.200" position="sticky" top={0} zIndex={10}>
        <Container maxW="6xl" py={3}>
          <Flex align="center" justify="space-between">
            <Heading size="md">Game <Text as="span" color="blue.300">Review</Text> Hub</Heading>
            <Badge colorScheme="blue" variant="subtle">API: {apiBase}</Badge>
          </Flex>
        </Container>
      </Box>

      <Container maxW="6xl" py={6}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
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

          <Box gridColumn={{ md: '1 / -1' }}>
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
                          <Box>
                            <Heading size="md" mb={1}>{g.title}</Heading>
                            <Text color="whiteAlpha.800">{g.platform} ・ 平均スコア: {g.avg_rating.toFixed(2)}</Text>
                            {g.released_on && <Text fontSize="sm" color="whiteAlpha.600">発売日: {g.released_on}</Text>}
                          </Box>
                          <ReviewBox gameId={g.id} onPosted={fetchGames} />
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
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
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
    <Box as="form" onSubmit={submit} width={{ base: '100%', md: 80 }}>
      <Stack spacing={2}>
        <Text fontSize="sm" color="whiteAlpha.700">スコア</Text>
        <NumberInput min={1} max={5} value={rating} onChange={(_, n) => setRating(Number.isNaN(n) ? 1 : n)}>
          <NumberInputField />
        </NumberInput>
        <Input placeholder="コメント（任意）" value={comment} onChange={(e) => setComment(e.target.value)} />
        <Button type="submit" colorScheme="blue" isLoading={busy}>レビュー投稿</Button>
        {error && <Text color="red.300" fontSize="sm">{error}</Text>}
      </Stack>
    </Box>
  )
}
