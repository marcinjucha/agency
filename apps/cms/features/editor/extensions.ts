import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import { TextStyle, Color } from '@tiptap/extension-text-style'

/**
 * Image with intrinsic `width`/`height` attributes.
 *
 * The base `@tiptap/extension-image` only models `src`/`alt`/`title`, so any
 * width/height passed to `setImage` is silently dropped and never reaches the
 * rendered `<img>`. Adding them as nullable attributes (rendered only when
 * present) lets the inserted `<img>` reserve layout space — preventing CLS
 * (Cumulative Layout Shift) on the public site — when the media item carries
 * stored dimensions. Existing content without these attrs parses unchanged
 * (attrs default to null → not rendered), so no schema migration is needed.
 */
const ImageWithDimensions = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        renderHTML: (attributes) =>
          attributes.width ? { width: attributes.width } : {},
      },
      height: {
        default: null,
        renderHTML: (attributes) =>
          attributes.height ? { height: attributes.height } : {},
      },
    }
  },
})

/**
 * Base Tiptap extensions used by the generic editor.
 * Blog adds media extensions on top of these via dependency injection.
 */
export const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    // StarterKit v3 bundles `link` + `underline`; we also register our own
    // explicitly below (`Link.configure(...)` with rel/target hardening,
    // `Underline`). Disable the bundled ones so our configured instances are
    // the only ones — silences Tiptap's "Duplicate extension names found:
    // ['link','underline']" warning AND guarantees our Link rel/target config wins.
    link: false,
    underline: false,
  }),
  // new tab + rel=noopener on all content links (closes reverse-tabnabbing)
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
  }),
  ImageWithDimensions.configure({ HTMLAttributes: { loading: 'lazy', decoding: 'async' } }),
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Highlight.configure({ multicolor: true }),
  TextStyle,
  Color,
]
