import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { errorHandler, notFound } from './http'
import { apiRouter } from './routes'

// No access log (the privacy policy says so): only failed requests are logged, by path without the query string,
// which can hold a visitor's search text.
const createRequestLogger = () =>
    pinoHttp({
        level: process.env.LOG_LEVEL ?? 'info',
        customLogLevel: (_req, res, error) => (error || res.statusCode >= 500 ? 'error' : 'silent'),
        serializers: {
            req: (req) => ({ method: req.method, path: String(req.url).split('?')[0] }),
            res: (res) => ({ status: res.statusCode }),
        },
    })

export const createApp = ({ isLoggingRequests = true }: { isLoggingRequests?: boolean } = {}) => {
    const app = express()

    app.disable('x-powered-by')
    app.set('query parser', 'simple')
    app.use(helmet())
    app.use(express.json({ limit: '16kb' }))

    if (isLoggingRequests) app.use(createRequestLogger())

    app.use('/api', apiRouter)
    app.use(notFound)
    app.use(errorHandler)

    return app
}
