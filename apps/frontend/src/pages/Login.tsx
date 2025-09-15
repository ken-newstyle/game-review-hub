import { useState } from 'react'
import { Box, Button, Heading, Input, Stack, Text, useToast, Card, CardHeader, CardBody } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'

const apiBase = (import.meta.env.VITE_API_BASE as string) ?? 'http://localhost:4000/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const toast = useToast()
  const navigate = useNavigate()

  const register = async () => {
    try {
      const r = await fetch(`${apiBase}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!r.ok) throw new Error('登録に失敗しました')
      toast({ title: '登録しました。続けてログインしてください', status: 'success' })
    } catch (e: any) {
      toast({ title: '登録に失敗', description: String(e.message ?? e), status: 'error' })
    }
  }

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const r = await fetch(`${apiBase}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!r.ok) throw new Error('ログインに失敗しました')
      const data = await r.json()
      localStorage.setItem('access_token', data.access_token)
      toast({ title: 'ログインしました', status: 'success' })
      navigate('/home')
    } catch (e: any) {
      toast({ title: 'ログインに失敗', description: String(e.message ?? e), status: 'error' })
    }
  }

  return (
    <Card>
      <CardHeader><Heading size="md">ログイン</Heading></CardHeader>
      <CardBody>
        <Box as="form" onSubmit={login}>
          <Stack spacing={3}>
            <Input type="email" placeholder="メールアドレス" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="パスワード（8文字以上）" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Stack direction={{ base: 'column', sm: 'row' }}>
              <Button type="submit" colorScheme="blue">ログイン</Button>
              <Button variant="outline" type="button" onClick={register}>新規登録</Button>
            </Stack>
            <Text fontSize="sm" color="whiteAlpha.700">ログイン後、ホームへ移動します。</Text>
          </Stack>
        </Box>
      </CardBody>
    </Card>
  )
}

