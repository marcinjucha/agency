import { baseExtensions } from '../../editor/extensions'
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
 * Full extension set for blog editor — base extensions + media.
 * Blog consumers pass this to TiptapEditor and generateHtmlFromContent
 * via dependency injection (editor/ has no knowledge of media extensions).
 */
export const editorExtensions = [
  ...baseExtensions,
  ...mediaExtensions,
]

export { baseExtensions }
export { VideoExtension, YouTubeExtension, VimeoExtension, InstagramExtension, TikTokExtension }
