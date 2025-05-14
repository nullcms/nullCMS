// import { motion } from "framer-motion"
// import { ChevronLeft, Eye, Code, Save } from "lucide-react"
import { CommandPalette } from "@/components/command-palette"
import { motion } from "framer-motion"
import { Eye, Code, Save } from "lucide-react"

interface HeaderProps {
    isEditable: boolean
    title: string
}

export function Header({title, isEditable = false}: HeaderProps) {
    // const pathname = useM()

    // // Extract title from pathname
    // const getTitle = () => {
    //     return ""
    // }

    // // Generate breadcrumbs
    // const generateBreadcrumbs = () => {
    //     if (paths.length === 0) return null

    //     return (
    //         <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
    //             {paths.map((path, i) => {
    //                 const href = `/${paths.slice(0, i + 1).join("/")}`
    //                 const isLast = i === paths.length - 1

    //                 return (
    //                     <span key={path} className="flex items-center">
    //                         {i > 0 && <span className="mx-1">/</span>}
    //                         {isLast ? (
    //                             <span className="text-muted-foreground/50">{path}</span>
    //                         ) : (
    //                             <Link href={href} className="hover:text-foreground transition-colors">
    //                                 {path}
    //                             </Link>
    //                         )}
    //                     </span>
    //                 )
    //             })}
    //         </div>
    //     )
    // }

    return (
        <header className="h-13 min-h-13 border-b border-border bg-background flex items-center px-4 justify-between">
            <div className="flex items-center gap-2 md:ml-0 ml-10">
                <h1 className="text-lg font-bold tracking-tighter brand">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
                {isEditable && (
                    <>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 transition-colors"
                        >
                            <Eye size={14} />
                            <span className="hidden md:inline">Preview</span>
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-accent hover:bg-accent/80 transition-colors"
                        >
                            <Code size={14} />
                            <span className="hidden md:inline">JSON</span>
                        </motion.button>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            <Save size={14} />
                            <span className="hidden md:inline">Save</span>
                        </motion.button>
                    </>
                 )} 
                <CommandPalette />
                {/* <UserProfile /> */}
            </div>
        </header>
    )
}
