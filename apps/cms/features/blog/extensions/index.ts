import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { VideoExtension } from './VideoExtension'
import { YouTubeExtension } from './YouTubeExtension'
import { VimeoExtension } from './VimeoExtension'
import { InstagramExtension } from './InstagramExtension'
import { TikTokExtension } from './TikTokExtension'

export const mediaExtensions = [
  VideoExtension,
  YouTubeExtension,
  VimeoExtension,
  InstagramExtension,
  TikTokExtension,
]

/**
 * Shared base extensions for Tiptap — used by both the interactive editor
 * (TiptapEditor.tsx) and server-side HTML generation (utils.ts/generateHTML).
 * Keep in sync: adding an extension here ensures both produce identical HTML.
 */
export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Link.configure({ openOnClick: false }),
  Image,
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  ...mediaExtensions,
]

export { VideoExtension, YouTubeExtension, VimeoExtension, InstagramExtension, TikTokExtension }
