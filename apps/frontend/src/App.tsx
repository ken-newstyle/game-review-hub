import { Box, Container, Flex, Heading, Text, Badge, Button } from '@chakra-ui/react'
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'

const apiBase = (import.meta.env.VITE_API_BASE as string) ?? 'http://localhost:4000/api'

export default function App() {
  return (
    <BrowserRouter>
      <Box>
        <Header />
        <Container maxW="6xl" py={6}>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </Container>
      </Box>
    </BrowserRouter>
  )
}

function Header() {
  const navigate = useNavigate()
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  return (
    <Box as="header" bg="gray.900" borderBottomWidth="1px" borderColor="whiteAlpha.200" position="sticky" top={0} zIndex={10}>
      <Container maxW="6xl" py={3}>
        <Flex align="center" justify="space-between" gap={4}>
          <Heading size="md"><Link to="/home">Game <Text as="span" color="blue.300">Review</Text> Hub</Link></Heading>
          <Flex align="center" gap={3}>
            <Badge colorScheme="blue" variant="subtle">API: {apiBase}</Badge>
            {!token ? (
              <Button as={Link} to="/login" size="sm" variant="outline">ログイン</Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => { localStorage.removeItem('access_token'); navigate('/login'); }}>ログアウト</Button>
            )}
          </Flex>
        </Flex>
      </Container>
    </Box>
  )
}

