import { Node, mergeAttributes, nodePasteRule } from '@tiptap/core'
import { extractVideoId } from '@/lib/video-utils'

export interface InstagramOptions {
  HTMLAttributes: Record<string, string>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    instagram: {
      setInstagram: (options: { src: string }) => ReturnType
    }
  }
}

const INSTAGRAM_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([\w-]+)/g

import { IFRAME_ALLOW, INSTAGRAM_INLINE_STYLE } from './constants'

export const InstagramExtension = Node.create<InstagramOptions>({
  name: 'instagram',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'instagram-embed',
        style: INSTAGRAM_INLINE_STYLE,
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
          if (!src.includes('instagram.com')) return false
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
      setInstagram:
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
        find: INSTAGRAM_URL_REGEX,
        type: this.type,
        getAttributes: (match) => {
          const url = match[0]
          const result = extractVideoId(url)
          if (!result || result.platform !== 'instagram') return false
          return { src: `https://www.instagram.com/p/${result.id}/embed/` }
        },
      }),
    ]
  },
})
