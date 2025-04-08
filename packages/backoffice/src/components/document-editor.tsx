"use client"

import {ReactNode, useState} from "react"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Textarea} from "@/components/ui/textarea"
import {Switch} from "@/components/ui/switch"
// import { Calendar } from "@/components/ui/calendar"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {ChevronDown, Code, Copy, Lightbulb, Loader2, MoreVertical, Plus, Save, Trash2} from "lucide-react"
import {Button} from "@/components/ui/button"
import {format, formatRelative} from "date-fns"
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover"
import {cn} from "@/lib/utils"
import {CalendarIcon} from "lucide-react"
import {
    Field,
    NumberField,
    StringField,
    BooleanField,
    ArrayField,
    DateField,
    RichTextField,
    FileField,
    Document,
    ImageField,
    ExpandField, SingletonSchema, CollectionSchema, // New field type
} from "@nullcms/shared"
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {ScrollArea} from "@/components/ui/scroll-area";
import {useCreateDocument, useDeleteDocument, useUpdateDocument, useUpdateSingleton} from "@/lib/client";
import {toast} from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog"


import { Plate } from '@udecode/plate/react';

import { editorPlugins } from '@/components/editor/plugins/editor-plugins';
import { useCreateEditor } from '@/components/editor/use-create-editor';
import { Editor, EditorContainer } from '@/components/plate-ui/editor';
import { DndProvider} from "react-dnd";
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Value } from "@udecode/plate"

// TypeScript types derived from Zod schemas

// Define value types for each field type
type StringValue = string;
type NumberValue = number;
type BooleanValue = boolean;
type DateValue = string;
type ImageValue = string;
type FileValue = string;
type RichTextValue = Value;
type ExpandValue = Record<string, unknown>;

// Recursive type for field values
type FieldValue<T extends Field> =
    T extends { type: "string" } ? StringValue :
        T extends { type: "number" } ? NumberValue :
            T extends { type: "boolean" } ? BooleanValue :
                T extends { type: "date" } ? DateValue :
                    T extends { type: "image" } ? ImageValue :
                        T extends { type: "file" } ? FileValue :
                            T extends { type: "richtext" } ? RichTextValue :
                                T extends { type: "expand" } ? ExpandValue :
                                    T extends {
                                            type: "array",
                                            of: infer SubType
                                        } ? Array<FieldValue<SubType extends Field ? SubType : never>> :
                                        never;

interface DocumentEditorProps {
    id: string;
    document?: Document;
    collectionId?: string;
    schema: SingletonSchema | CollectionSchema;
}

export function DocumentEditor({id, document, schema, collectionId}: DocumentEditorProps) {
    const [values, setValues] = useState<Record<string, unknown>>(document || {});
    const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
    const [activeTab, setActiveTab] = useState("editor");
    const [open, setOpen] = useState(false);

    const updateSingleton = useUpdateSingleton(id!)
    const updateDocument = useUpdateDocument(collectionId!)
    const createDocument = useCreateDocument(collectionId!)
    const deleteDocument = useDeleteDocument(collectionId!)

    // Identify unknown fields (fields in document but not in schema)
    const getUnknownFields = (): string[] => {
        const schemaFieldKeys = Object.keys(schema.fields);
        return Object.keys(values).filter(key => !schemaFieldKeys.includes(key) && key !== "_id" && key != "_updatedAt" && key != "_createdAt");
    };

  const toggleExpand = (fieldId: string): void => {
        setExpandedFields((prev) => ({
            ...prev,
            [fieldId]: !prev[fieldId],
        }));
    };

    const handleFieldChange = <T extends Field>(fieldId: string, value: FieldValue<T>): void => {
        // For nested paths like "expand.nestedField" or array items like "socialLinks.0"
        if (fieldId.includes('.')) {
            const parts = fieldId.split('.');
            const topLevelField = parts[0];

            setValues((prev) => {
                // Get the current value of the top-level field
                const currentTopValue = prev[topLevelField] as Record<string, unknown> | unknown[] | undefined;

                // If we're modifying an array item (e.g., socialLinks.0)
                if (parts.length === 2 && !isNaN(Number(parts[1]))) {
                    // We're updating a specific array index
                    const index = Number(parts[1]);
                    // Make sure we have an array to work with
                    const currentArray = Array.isArray(currentTopValue) ? [...currentTopValue] : [];
                    // Update the specific index
                    currentArray[index] = value;

                    return {
                        ...prev,
                        [topLevelField]: currentArray,
                    };
                }

                // Handle deeper nested paths
                // Create a deep copy to avoid mutating state directly
                let newTopValue: Record<string, unknown> | unknown[];
                if (Array.isArray(currentTopValue)) {
                    newTopValue = [...currentTopValue];
                } else if (currentTopValue && typeof currentTopValue === 'object') {
                    newTopValue = {...currentTopValue as Record<string, unknown>};
                } else {
                    newTopValue = {};
                }

                // Traverse the nested path and set the value
                let current = newTopValue as Record<string, unknown>;
                for (let i = 1; i < parts.length - 1; i++) {
                    const part = parts[i];
                    // Make sure the current level has the needed property
                    if (!current[part] || typeof current[part] !== 'object') {
                        // Check if the next part is a number (array index)
                        const nextIsNumber = !isNaN(Number(parts[i+1]));
                        current[part] = nextIsNumber ? [] : {};
                    }
                    // Move to the next level down
                    current = current[part] as Record<string, unknown>;
                }

                // Set the value at the final part of the path
                const lastPart = parts[parts.length - 1];
                current[lastPart] = value;

                return {
                    ...prev,
                    [topLevelField]: newTopValue,
                };
            });
        } else {
            // This is for top-level fields (no dots in the path)
            // For array fields, we need special handling
            const field = schema.fields[fieldId];

            if (field && field.type === "array") {
                setValues((prev) => {
                    // Get the current array (or create an empty one)
                    const currentArray = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];

                    // If value is already an array, use it directly
                    const newArray = Array.isArray(value) ? value : currentArray;

                    return {
                        ...prev,
                        [fieldId]: newArray,
                    };
                });
            } else {
                // For non-array fields, just set the value directly
                setValues((prev) => ({
                    ...prev,
                    [fieldId]: value,
                }));
            }
        }
    };

    // Delete a field from the document
    const deleteField = (fieldId: string): void => {
        setValues((prev) => {
            const newValues = {...prev};
            delete newValues[fieldId];
            return newValues;
        });
    };

    const saveDocument = async () => {
        if (collectionId) {
            if (id != "new") {
                await updateDocument.mutateAsync({id, data: values});
            } else {
                await createDocument.mutateAsync(values);

            }
        }
        else {
            await updateSingleton.mutateAsync(values);
        }
    }

    const copyJSON = async () => {
        await navigator.clipboard.writeText(JSON.stringify(values, null, 2));
        toast("Copied to clipboard", {
            description: "Document JSON has been copied to your clipboard",
        })
    }

    // Get a nested value using a path like "expand.nestedField"
    const getNestedValue = (path: string): unknown => {
        const parts = path.split('.');
        let current: unknown = values;

        for (const part of parts) {
            if (current === undefined || current === null || typeof current !== 'object') {
                return undefined;
            }
            current = (current as Record<string, unknown>)[part];
        }

        return current;
    };

    // Render an unknown field with its value and delete button
    const renderUnknownField = (fieldId: string, value: unknown): React.ReactNode => {
        return (
            <div className="flex items-center justify-between border rounded p-4">
                <div className="flex-1">
                    <Label className="mb-1 block">{fieldId}</Label>
                    <div className="text-sm border rounded bg-slate-50 p-2 overflow-auto">
                        {typeof value === 'object'
                            ? JSON.stringify(value, null, 2)
                            : String(value)}
                    </div>
                </div>
                <Button
                    variant="destructive"
                    size="icon"
                    className="ml-4"
                    onClick={() => deleteField(fieldId)}
                >
                    <Trash2 className="h-4 w-4"/>
                </Button>
            </div>
        );
    };

    const renderStringField = (fieldId: string, field: StringField): React.ReactNode => {
        const value = getNestedValue(fieldId) as StringValue | undefined;
        const defaultValue = field.default ?? "";
        const currentValue = value !== undefined ? value : defaultValue;

        return (
            <div className="grid gap-2">
                <Label htmlFor={fieldId}>{field.label}</Label>
                <Input
                    id={fieldId}
                    value={currentValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleFieldChange<StringField>(fieldId, e.target.value)
                    }
                    placeholder={field.label}
                    required={field.required}
                    pattern={field.pattern}
                />
            </div>
        );
    };

    const renderNumberField = (fieldId: string, field: NumberField): React.ReactNode => {
        const value = getNestedValue(fieldId) as NumberValue | undefined;
        const defaultValue = field.default ?? 0;
        const currentValue = value !== undefined ? value : defaultValue;

        return (
            <div className="grid gap-2">
                <Label htmlFor={fieldId}>{field.label}</Label>
                <Input
                    id={fieldId}
                    type="number"
                    value={currentValue.toString()}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleFieldChange<NumberField>(fieldId, Number(e.target.value))
                    }
                    placeholder={field.label}
                    required={field.required}
                    min={field.min}
                    max={field.max}
                />
            </div>
        );
    };

    const renderBooleanField = (fieldId: string, field: BooleanField): React.ReactNode => {
        const value = getNestedValue(fieldId) as BooleanValue | undefined;
        const defaultValue = field.default ?? false;
        const currentValue = value !== undefined ? value : defaultValue;

        return (
            <div className="flex items-center justify-between gap-2">
                <Label htmlFor={fieldId}>{field.label}</Label>
                <Switch
                    id={fieldId}
                    checked={currentValue}
                    onCheckedChange={(checked: boolean) =>
                        handleFieldChange<BooleanField>(fieldId, checked)
                    }
                />
            </div>
        );
    };

    const renderDateField = (fieldId: string, field: DateField): React.ReactNode => {
        const value = getNestedValue(fieldId) as DateValue | undefined;
        const defaultValue = field.default ?? "";
        const currentValue = value !== undefined ? value : defaultValue;

        return (
            <div className="grid gap-2">
                <Label htmlFor={fieldId}>{field.label}</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id={fieldId}
                            type="button"
                            variant="outline"
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !currentValue && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4"/>
                            {currentValue ? format(new Date(currentValue), "PPP") : "Select date"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        {/*<Calendar*/}
                        {/*    mode="single"*/}
                        {/*    selected={currentValue ? new Date(currentValue) : undefined}*/}
                        {/*    onSelect={(date: Date | undefined) =>*/}
                        {/*        handleFieldChange<DateField>(*/}
                        {/*            fieldId,*/}
                        {/*            date ? date.toISOString() : ""*/}
                        {/*        )*/}
                        {/*    }*/}
                        {/*    initialFocus*/}
                        {/*/>*/}
                    </PopoverContent>
                </Popover>
            </div>
        );
    };

    const renderRichTextField = (fieldId: string, field: RichTextField): React.ReactNode => {
        const value = getNestedValue(fieldId) as string;
        const editor = useCreateEditor({
            plugins: [...editorPlugins],
            value: value ?? []
        });

        return (
            <div className="grid gap-2">
                <Label htmlFor={fieldId}>{field.label}</Label>
                <DndProvider backend={HTML5Backend}>
                    <Plate 
                        editor={editor}
                        onChange={({ value }) => {
                            handleFieldChange(fieldId, value)
                        }}
                    >
                        <EditorContainer >
                            <Editor/>
                        </EditorContainer>
                    </Plate>
                </DndProvider>
            </div>
        );
    };

    const renderImageField = (fieldId: string, field: ImageField): React.ReactNode => {
        const value = getNestedValue(fieldId) as ImageValue | undefined;

        return (
            <div className="grid gap-2">
                <Label htmlFor={fieldId}>{field.label}</Label>
                <div className="flex items-center gap-2">
                    <Input
                        id={fieldId}
                        type="file"
                        accept="image/*"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                // This is a simplified example - in a real app you'd handle file upload properly
                                const objectUrl = URL.createObjectURL(file);
                                handleFieldChange<ImageField>(fieldId, objectUrl);
                            }
                        }}
                        required={field.required}
                    />
                    {value && (
                        <div className="h-16 w-16 relative border rounded overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-center p-1">
                                Image Preview
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderFileField = (fieldId: string, field: FileField): React.ReactNode => {
        const value = getNestedValue(fieldId) as FileValue | undefined;

        return (
            <div className="grid gap-2">
                <Label htmlFor={fieldId}>{field.label}</Label>
                <Input
                    id={fieldId}
                    type="file"
                    accept={field.allowedTypes?.join(',') || undefined}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            // This is a simplified example - in a real app you'd handle file upload properly
                            handleFieldChange<FileField>(fieldId, file.name);
                        }
                    }}
                    required={field.required}
                />
                {value && <p className="text-xs">Selected file: {value}</p>}
            </div>
        );
    };

    // Recursive function to render array items based on their field type
    function renderArrayItems<T extends Field>(
        fieldId: string,
        itemSchema: T,
        itemValues: Array<FieldValue<T>> | any
    ): ReactNode {
        // Ensure itemValues is an array before using map
        const values = Array.isArray(itemValues) ? itemValues : [];

        return (
            <>
                {values.map((itemValue, index) => (

                    <div key={index} className="border rounded p-2 pb-2 mb-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className=" h-7 w-7 opacity-40 hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                            onClick={() => {
                                const newArr = [...values];
                                newArr.splice(index, 1);
                                handleFieldChange<ArrayField>(fieldId, newArr as FieldValue<ArrayField>);
                            }}
                        >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove item</span>
                        </Button>

                        {/* Render the subfield with its specific value */}
                        {renderFieldByType(
                            `${fieldId}.${index}`,
                            itemSchema,
                            itemValue
                        )}
                    </div>
                ))}
            </>
        );
    }

    // Function to create a default value for a given field type
    function createDefaultValue(fieldSchema: Field): unknown {
        switch (fieldSchema.type) {
            case "array":
                return [];  // Always return an empty array for array fields
            // Other cases remain the same
            case "string":
                return (fieldSchema as StringField).default ?? "";
            case "number":
                return (fieldSchema as NumberField).default ?? 0;
            case "boolean":
                return (fieldSchema as BooleanField).default ?? false;
            case "date":
                return (fieldSchema as DateField).default ?? "";
            case "richtext":
                return (fieldSchema as RichTextField).default ?? "";
            case "image":
                return "";
            case "file":
                return "";
            case "expand":
                return {};
            default:
                throw new Error(`Unsupported field type: ${(fieldSchema as { type: string }).type}`);
        }
    }

    const renderArrayField = <T extends Field>(fieldId: string, field: ArrayField): React.ReactNode => {
        const value = getNestedValue(fieldId);
        // Make sure currentValue is always an array
        const currentValue = Array.isArray(value) ? value : [];

        return (
            <div className="grid gap-2">
                <div className="flex">
                    <Label className="mr-auto" htmlFor={fieldId}>{field.label}</Label>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className=" h-7 w-7 opacity-40 hover:opacity-100"
                        onClick={() => {
                            // Create default value for the item type
                            const defaultValue = createDefaultValue(field.of as T);

                            // Get the current array (or empty array if it doesn't exist)
                            setValues((prev) => {
                                const currentArr = Array.isArray(prev[fieldId]) ? [...prev[fieldId]] : [];
                                return {
                                    ...prev,
                                    [fieldId]: [...currentArr, defaultValue]
                                };
                            });
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        <span className="sr-only">Add item</span>
                    </Button>
                </div>
                <div className="space-y-2">
                    {Array.isArray(currentValue) && renderArrayItems(fieldId, field.of as T, currentValue as Array<FieldValue<T>>)}
                    {field.min !== undefined && (
                        <p className="text-xs text-muted-foreground">
                            Minimum items: {field.min}
                        </p>
                    )}
                    {field.max !== undefined && (
                        <p className="text-xs text-muted-foreground">
                            Maximum items: {field.max}
                        </p>
                    )}
                </div>
            </div>
        );
    };

    // New function to render expand field
    const renderExpandField = (fieldId: string, field: ExpandField): React.ReactNode => {
        const isExpanded = expandedFields[fieldId];

        // Initialize nested fields as an empty object if not already set
        if (getNestedValue(fieldId) === undefined) {
            handleFieldChange<ExpandField>(fieldId, {});
        }

        return (
            <Card className="w-full">
                <CardHeader className="cursor-pointer" onClick={() => toggleExpand(fieldId)}>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{field.label}</CardTitle>
                            {field.description && <CardDescription>{field.description}</CardDescription>}
                        </div>
                        <ChevronDown
                            className={`h-5 w-5 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                            }`}
                        />
                    </div>
                </CardHeader>
                {isExpanded && (
                    <CardContent className="space-y-4">
                        {field.fields.map((nestedField) => (
                            <div key={nestedField.id} className="space-y-2">
                                {renderFieldByType(`${fieldId}.${nestedField.id}`, nestedField.schema)}
                            </div>
                        ))}
                    </CardContent>
                )}
            </Card>
        );
    };

    // Type-safe way to render a field based on its value
    function renderFieldByType<T extends Field>(
        fieldId: string,
        fieldSchema: T,
        fieldValue?: unknown
    ): React.ReactNode {
        // Update the values state if a value is provided and it's not yet in state
        if (fieldValue !== undefined && getNestedValue(fieldId) === undefined) {
            handleFieldChange(fieldId, fieldValue as FieldValue<T>);
        }

        switch (fieldSchema.type) {
            case "string":
                return renderStringField(fieldId, fieldSchema as StringField);
            case "number":
                return renderNumberField(fieldId, fieldSchema as NumberField);
            case "boolean":
                return renderBooleanField(fieldId, fieldSchema as BooleanField);
            case "date":
                return renderDateField(fieldId, fieldSchema as DateField);
            case "richtext":
                return renderRichTextField(fieldId, fieldSchema as RichTextField);
            case "image":
                return renderImageField(fieldId, fieldSchema as ImageField);
            case "file":
                return renderFileField(fieldId, fieldSchema as FileField);
            case "array":
                return renderArrayField(fieldId, fieldSchema as ArrayField);
            case "expand":
                return renderExpandField(fieldId, fieldSchema as ExpandField);
            default:
                return <div>Unsupported field type</div>;
        }
    }

    // Get unknown fields from the document
    const unknownFields = getUnknownFields();

    return (
        <>
            <header className="border-b px-4 py-2 bg-background z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <h1 className="text-xl font-bold">{schema.title}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[200px]">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="editor">Editor</TabsTrigger>
                                <TabsTrigger value="json">
                                    <Code className="h-4 w-4 mr-1"/>
                                    JSON
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <Button variant="outline" size="icon" onClick={() => saveDocument()}>
                            {updateSingleton.isPending || updateDocument.isPending || createDocument.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin"/>
                            ) : (
                                <Save className="h-4 w-4"/>
                            )}
                        </Button>
                        <Button variant="outline" size="icon">
                            <Lightbulb className="h-4 w-4"/>
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" >
                                    <MoreVertical className="h-4 w-4"/>
                                    <span className="sr-only">More options</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Document Actions</DropdownMenuLabel>
                                <DropdownMenuItem>
                                    <Copy className="mr-2 h-4 w-4"/>
                                    Copy as JSON
                                </DropdownMenuItem>
                                {collectionId ?
                                    <>
                                    <DropdownMenuSeparator/>
                                        <DropdownMenuItem className="text-destructive" onClick={() => {setOpen(true)}}>
                                            <Trash2 className="mr-2 h-4 w-4"/>
                                            Delete Document
                                        </DropdownMenuItem>
                                    </>
                                    : null}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground">
                    Last updated: {document ? formatRelative(document._updatedAt!, new Date()): null}
                </p>
            </header>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
                <TabsContent value="editor" className="h-full p-6 overflow-auto">
                    <div className="space-y-6">
                        {/* Render known schema fields */}
                        {Object.keys(schema.fields).map((field) => (
                            <div key={schema.fields[field].label} className="space-y-2">
                                {renderFieldByType(field, schema.fields[field])}
                            </div>
                        ))}

                        {/* Render unknown fields section if there are any */}
                        {unknownFields.length > 0 && (
                            <div className="mt-8">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Unknown Fields</CardTitle>
                                        <CardDescription>
                                            Fields in the document that are not defined in the schema
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {unknownFields.map((fieldId) => (
                                            <div key={fieldId}>
                                                {renderUnknownField(fieldId, values[fieldId])}
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                </TabsContent>
                <TabsContent value="json" className="h-full p-6 overflow-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">JSON Output</h2>
                        <Button variant="outline" size="sm" onClick={() => copyJSON()}>
                            <Copy className="h-4 w-4 mr-2"/>
                            Copy JSON
                        </Button>
                    </div>
                    <ScrollArea className="h-[calc(100vh-250px)] w-full rounded-md border p-4 bg-muted/50">
                        <pre className="text-sm font-mono whitespace-pre">{JSON.stringify(values, null, 2)}</pre>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
            <AlertDialog open={open} onOpenChange={setOpen} >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deleting a document cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                            await deleteDocument.mutateAsync(id)
                        }}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>

    )
}
