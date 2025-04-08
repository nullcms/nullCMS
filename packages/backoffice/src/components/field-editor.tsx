"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
    Save,
    Lightbulb,
    X,
    Copy,
    Trash2,
    FileDown,
    Search,
} from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {toast} from "sonner";
import {SingletonSchema} from "@nullcms/shared";
import {useSingleton} from "@/lib/client";
import {DocumentEditor} from "@/components/document-editor";

interface FieldEditorProps {
    schema: SingletonSchema
    id: string
}

export function FieldEditor({schema, id}: FieldEditorProps) {
    const [showIdeas, setShowIdeas] = useState(false)
    const [commandMenuOpen, setCommandMenuOpen] = useState(false)

    const singleton = useSingleton(id);

    // Command+K handler
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault()
            setCommandMenuOpen(true)
        }
    }, [])

    useEffect(() => {
        window.addEventListener("keydown", handleKeyDown)
        return () => {
            window.removeEventListener("keydown", handleKeyDown)
        }
    }, [handleKeyDown])

    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(document, null, 2))
        toast("Copied to clipboard", {
            description: "Document JSON has been copied to your clipboard",
        })
    }

    const handleDelete = () => {
        // In a real app, this would delete the document
        // toast({
        //     title: "Document deleted",
        //     description: "This is a simulation. In a real app, the document would be deleted.",
        //     variant: "destructive",
        // })
    }

    const handleExport = () => {
        // Create a blob and download it
        const blob = new Blob([JSON.stringify(document, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `${document.title.toLowerCase().replace(/\s+/g, "-")}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        // toast({
        //     title: "Document exported",
        //     description: "Your document has been exported as JSON",
        // })
    }

    const toggleIdeas = () => {
        setShowIdeas(!showIdeas)
    }

    // Command menu actions
    const commandActions = [
        {
            name: "Save Document",
            icon: <Save className="mr-2 h-4 w-4" />,
            action: () => {
                toast("Document Saved", {
                    description: "Document has been saved",
                })
            },
            shortcut: "⌘S",
        },
        {
            name: "Toggle Ideas Panel",
            icon: <Lightbulb className="mr-2 h-4 w-4" />,
            action: toggleIdeas,
            shortcut: "⌘I",
        },
        {
            name: "Copy as JSON",
            icon: <Copy className="mr-2 h-4 w-4" />,
            action: copyToClipboard,
            shortcut: "⌘⇧C",
        },
        {
            name: "Export Document",
            icon: <FileDown className="mr-2 h-4 w-4" />,
            action: handleExport,
            shortcut: "⌘E",
        },
        {
            name: "Delete Document",
            icon: <Trash2 className="mr-2 h-4 w-4" />,
            action: handleDelete,
            shortcut: "⌘⇧D",
            destructive: true,
        },
    ]

    return (
        <div className="flex h-full flex-col w-full flex-1">
            {singleton.isLoading ? null : <DocumentEditor document={singleton.data!} schema={schema} id={id} />}

            {/* Command Menu Dialog */}
            <Dialog open={commandMenuOpen} onOpenChange={setCommandMenuOpen}>
                <DialogContent className="sm:max-w-[550px] p-0">
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                            className="flex h-12 rounded-md border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Type a command or search..."
                            autoFocus
                        />
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {commandActions.map((action, index) => (
                            <button
                                key={index}
                                className={cn(
                                    "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent",
                                    action.destructive && "text-destructive",
                                )}
                                onClick={() => {
                                    action.action()
                                    setCommandMenuOpen(false)
                                }}
                            >
                                <div className="flex items-center">
                                    {action.icon}
                                    <span>{action.name}</span>
                                </div>
                                {action.shortcut && (
                                    <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                                        {action.shortcut}
                                    </kbd>
                                )}
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Ideas Panel - Fixed */}
            {showIdeas && (
                <div className="w-80 border-l bg-background">
                    <div className="p-2 border-b flex items-center justify-between">
                        <h2 className="font-semibold flex items-center gap-1">
                            <Lightbulb className="h-4 w-4" />
                            Ideas & Research
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowIdeas(false)}
                            title="Close panel"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="p-3">
                        {/*<IdeasPanel />*/}
                    </div>
                </div>
            )}
        </div>
    )
}

