'use client';

import { Plate } from '@udecode/plate/react';

import { editorPlugins } from '@/components/editor/plugins/editor-plugins';
import { useCreateEditor } from '@/components/editor/use-create-editor';
import { Editor, EditorContainer } from '@/components/plate-ui/editor';
import { DndProvider} from "react-dnd";
import { HTML5Backend } from 'react-dnd-html5-backend';


export function RichTextEditor({ id, defaultValue }: { id: string, defaultValue: string}) {
    const value = JSON.parse(defaultValue ?? '[]');
    const editor = useCreateEditor({
        plugins: [...editorPlugins],
        value
    });

    return (
        <DndProvider backend={HTML5Backend}>
            <Plate 
                editor={editor}
                onChange={({ value }) => {
                    console.log(value);
                }}
            >
                <EditorContainer >
                    <Editor/>
                </EditorContainer>
            </Plate>
        </DndProvider>
    );
}
