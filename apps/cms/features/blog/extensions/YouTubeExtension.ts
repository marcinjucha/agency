import { Node, mergeAttributes, nodePasteRule } from '@tiptap/core'
import { extractVideoId } from '@/lib/video-utils'

export interface YouTubeOptions {
  HTMLAttributes: Record<string, string>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    youtube: {
      setYouTube: (options: { src: string }) => ReturnType
    }
  }
}

const YOUTUBE_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/g

import { IFRAME_ALLOW } from './constants'

export const YouTubeExtension = Node.create<YouTubeOptions>({
  name: 'youtube',
  group: 'block',
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'youtube-embed',
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
          if (!src.includes('youtube.com/embed')) return false
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
      setYouTube:
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
        find: YOUTUBE_URL_REGEX,
        type: this.type,
        getAttributes: (match) => {
          const url = match[0]
          const result = extractVideoId(url)
          if (!result || result.platform !== 'youtube') return false
          return { src: `https://www.youtube.com/embed/${result.id}` }
        },
      }),
    ]
  },
})
