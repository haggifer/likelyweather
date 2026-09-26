import express from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { errorHandler, notFound } from './http'
import { apiRouter } from './routes'

export const createApp = ({ logRequests = true }: { logRequests?: boolean } = {}) => {
    const app = express()

    app.disable('x-powered-by')
    app.set('query parser', 'simple')
    app.use(helmet())
    app.use(express.json({ limit: '16kb' }))

    if (logRequests) {
        app.use(
            pinoHttp({
                level: process.env.LOG_LEVEL ?? 'info',
                serializers: {
                    req: (req) => ({ method: req.method, url: req.url }),
                    res: (res) => ({ status: res.statusCode }),
                },
            }),
        )
    }

    app.use('/api', apiRouter)
    app.use(notFound)
    app.use(errorHandler)

    return app
}
