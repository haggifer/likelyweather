import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { errorHandler, notFound } from './http'
import { apiRouter } from './routes'

const createRequestLogger = () =>
    pinoHttp({
        level: process.env.LOG_LEVEL ?? 'info',
        serializers: {
            req: (req) => ({ method: req.method, url: req.url }),
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
