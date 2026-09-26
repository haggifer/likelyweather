import { createApp } from './app'

// Locally the API listens on API_PORT; on Lambda the Web Adapter forwards requests to PORT (8080 by default).
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000)

createApp().listen(port, () => console.log(`API listening on http://localhost:${port}`))
