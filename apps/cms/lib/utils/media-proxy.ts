/**
 * Creates a minimal Editor proxy object for InsertMediaModal.
 *
 * InsertMediaModal expects a Tiptap Editor that supports
 * editor.chain().focus().setImage({ src }).run(). This factory
 * returns a lightweight proxy that intercepts the setImage call
 * and forwards the URL to the provided callback.
 *
 * Used by: ProductSettingsSidebar (cover image), ProductImageManager
 * (gallery images), BlogPostEditor (cover image).
 */
export function createMediaProxyEditor(onImage: (url: string) => void) {
  return {
    chain: () => {
      const chainProxy = {
        focus: () => chainProxy,
        setImage: ({ src }: { src: string }) => {
          onImage(src)
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
