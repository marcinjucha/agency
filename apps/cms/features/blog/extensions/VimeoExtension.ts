import { Node, mergeAttributes, nodePasteRule } from '@tiptap/core'
import { extractVideoId } from '@/lib/video-utils'

export interface VimeoOptions {
  HTMLAttributes: Record<string, string>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    vimeo: {
      setVimeo: (options: { src: string }) => ReturnType
    }
  }
}

const VIMEO_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/g

import { IFRAME_ALLOW } from './constants'

export const VimeoExtension = Node.create<VimeoOptions>({
  name: 'vimeo',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'vimeo-embed',
        style: 'aspect-ratio:16/9;width:100%;border-radius:0.5rem;margin:1.5rem 0;',
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
          if (!src.includes('player.vimeo.com/video')) return false
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
      setVimeo:
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
        find: VIMEO_URL_REGEX,
        type: this.type,
        getAttributes: (match) => {
          const url = match[0]
          const result = extractVideoId(url)
          if (!result || result.platform !== 'vimeo') return false
          return { src: `https://player.vimeo.com/video/${result.id}` }
        },
      }),
    ]
  },
})
