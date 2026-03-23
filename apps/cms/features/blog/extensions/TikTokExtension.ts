import { Node, mergeAttributes, nodePasteRule } from '@tiptap/core'
import { extractVideoId } from '@/lib/video-utils'

export interface TikTokOptions {
  HTMLAttributes: Record<string, string>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tiktok: {
      setTikTok: (options: { src: string }) => ReturnType
    }
  }
}

const TIKTOK_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com\/@[\w.-]+\/video\/(\d+)|vm\.tiktok\.com\/([\w-]+)|tiktok\.com\/t\/([\w-]+))/g

import { IFRAME_ALLOW } from './constants'

export const TikTokExtension = Node.create<TikTokOptions>({
  name: 'tiktok',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'tiktok-embed',
        style: 'width:100%;max-width:500px;height:750px;border-radius:0.5rem;margin:1.5rem auto;display:block;background:#000;',
      },
    }
  },

  addAttributes() {
    return {
      src: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'iframe',
        getAttrs: (node) => {
          const src = (node as HTMLElement).getAttribute('src') || ''
          if (!src.includes('tiktok.com/embed')) return false
          return { src }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'iframe',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        frameborder: '0',
        allowfullscreen: 'true',
        allow: IFRAME_ALLOW,
      }),
    ]
  },

  addCommands() {
    return {
      setTikTok:
        (options) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: options,
          }),
    }
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: TIKTOK_URL_REGEX,
        type: this.type,
        getAttributes: (match) => {
          const url = match[0]
          const result = extractVideoId(url)
          if (!result || result.platform !== 'tiktok') return false
          return { src: `https://www.tiktok.com/embed/v2/${result.id}` }
        },
      }),
    ]
  },
})
