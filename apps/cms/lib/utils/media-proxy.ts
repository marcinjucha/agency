/**
 * Attributes InsertMediaModal passes to `setImage`. `alt` (and the optional
 * intrinsic dimensions) are now threaded through alongside `src` so callers that
 * want the full attribute set can receive it. Cover-image pickers only need the
 * URL, so the proxy callback still forwards just `src` by default — but the
 * richer `onImageWithAttrs` overload exposes the rest when needed.
 */
type ProxyImageAttrs = {
  src: string
  alt?: string
  width?: number | null
  height?: number | null
}

/**
 * Creates a minimal Editor proxy object for InsertMediaModal.
 *
 * InsertMediaModal expects a Tiptap Editor that supports
 * editor.chain().focus().setImage({ src, alt, width?, height? }).run().
 * This factory returns a lightweight proxy that intercepts the setImage call
 * and forwards the URL (and, via the optional second callback, the full attrs)
 * to the provided callbacks.
 *
 * Used by: ProductSettingsSidebar (cover image), ProductImageManager
 * (gallery images), BlogPostEditor (cover image). These consumers store the
 * image URL only (cover image picker) — alt/dimensions are threaded through
 * harmlessly since they don't insert into html_body content here.
 */
export function createMediaProxyEditor(
  onImage: (url: string) => void,
  onImageWithAttrs?: (attrs: ProxyImageAttrs) => void
) {
  return {
    chain: () => {
      const chainProxy = {
        focus: () => chainProxy,
        setImage: (attrs: ProxyImageAttrs) => {
          onImage(attrs.src)
          onImageWithAttrs?.(attrs)
          return chainProxy
        },
        setVideo: () => chainProxy,
        setYouTube: () => chainProxy,
        setVimeo: () => chainProxy,
        setInstagram: () => chainProxy,
        setTikTok: () => chainProxy,
        run: () => true,
      }
      return chainProxy
    },
  }
}
