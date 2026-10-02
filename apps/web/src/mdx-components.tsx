import { toAnchorId } from '@/components/legal/anchor'
import type { MDXComponents } from 'mdx/types'
import type { ReactNode } from 'react'

const getAnchorId = (children: ReactNode) => (typeof children === 'string' ? toAnchorId(children) : undefined)

// Element styles for the legal pages' MDX text; the app has no typography plugin.
const COMPONENTS: MDXComponents = {
    h2: ({ children }) => (
        <h2 id={getAnchorId(children)} className="mt-8 mb-3 text-xl font-semibold tracking-tight">
            {children}
        </h2>
    ),
    h3: ({ children }) => (
        <h3 id={getAnchorId(children)} className="mt-6 mb-2 text-base font-semibold">
            {children}
        </h3>
    ),
    p: ({ children }) => <p className="my-3">{children}</p>,
    ul: ({ children }) => <ul className="my-3 flex list-disc flex-col gap-1.5 pl-6">{children}</ul>,
    ol: ({ children }) => <ol className="my-3 flex list-decimal flex-col gap-1.5 pl-6">{children}</ol>,
    a: ({ href, children }) =>
        href?.startsWith('http') || href?.startsWith('mailto:') ? (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
            >
                {children}
            </a>
        ) : (
            <a href={href} className="text-primary underline underline-offset-2">
                {children}
            </a>
        ),
    table: ({ children }) => (
        <div className="my-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[0.8125rem]">{children}</table>
        </div>
    ),
    th: ({ children }) => <th className="border-b px-2 py-1.5 font-semibold">{children}</th>,
    td: ({ children }) => <td className="border-b px-2 py-1.5 align-top">{children}</td>,
}

export const useMDXComponents = (): MDXComponents => COMPONENTS
