import React from 'react'
import { createRoot } from 'react-dom/client'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import App from './App'

const el = document.getElementById('root')!
const theme = extendTheme({
  initialColorMode: 'dark',
  useSystemColorMode: false,
})

createRoot(el).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>
)
