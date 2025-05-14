import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Command, FileText, Settings, Home, Database, Search, X } from "lucide-react"

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")

  // Command palette items
  const items = [
    {
      group: "Collections",
      items: [
        {
          name: "Blog Posts",
          icon: <FileText size={16} />,
          action: () => {
            // router.push("/collections/blog-post")
            setIsOpen(false)
          },
        },
      ],
    },
    {
      group: "Singletons",
      items: [
        {
          name: "Site Settings",
          icon: <Settings size={16} />,
          action: () => {
            // router.push("/singletons/site-settings")
            setIsOpen(false)
          },
        },
        {
          name: "Homepage",
          icon: <Home size={16} />,
          action: () => {
            // router.push("/singletons/homepage")
            setIsOpen(false)
          },
        },
      ],
    },
    {
      group: "Tools",
      items: [
        {
          name: "Data Explorer",
          icon: <Database size={16} />,
          action: () => {
            // router.push("/data-explorer")
            setIsOpen(false)
          },
        },
      ],
    },
  ]

  // Filter items based on search query
  const filteredItems = query
    ? items
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())),
        }))
        .filter((group) => group.items.length > 0)
    : items

  // Handle keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 px-2 py-1 bg-accent text-xs"
        aria-label="Open command palette"
      >
        <Command size={12} />
        <span className="hidden md:inline">K</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="fixed left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
            >
              <div className="border border-border bg-background shadow-lg">
                <div className="flex items-center border-b border-border p-3">
                  <Search size={16} className="text-muted-foreground mr-2" />
                  <input
                    type="text"
                    placeholder="Search commands..."
                    className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                  <button type="button" onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {filteredItems.map((group, groupIndex) => (
                    <div key={crypto.randomUUID()} className="py-2">
                      <div className="px-3 py-1 text-xs text-muted-foreground">{group.group}</div>
                      {group.items.map((item, itemIndex) => (
                        <button
                            type="button"
                          key={crypto.randomUUID()}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left"
                          onClick={item.action}
                        >
                          {item.icon}
                          <span>{item.name}</span>
                        </button>
                      ))}
                    </div>
                  ))}

                  {filteredItems.length === 0 && (
                    <div className="px-3 py-6 text-center text-muted-foreground text-sm">No results found</div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
