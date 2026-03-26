import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'

/**
 * Base Tiptap extensions used by the generic editor.
 * Blog adds media extensions on top of these via dependency injection.
 */
export const baseExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Link.configure({ openOnClick: false }),
  Image,
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
]
