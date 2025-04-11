"use client";

import { DocumentEditor } from "@/components/document-editor";
import { useDocument } from "@/lib/client";
import type { CollectionSchema } from "@nullcms/shared";

interface FieldEditorProps {
	schema: CollectionSchema;
	id: string;
	collectionName: string;
}

export function CollectionEditor({
	schema,
	collectionName,
	id,
}: FieldEditorProps) {
	if (id === "new") {
		return (
			<div className="flex h-full flex-col w-full flex-1">
				<DocumentEditor schema={schema} id={id} collectionId={collectionName} />
			</div>
		);
	}

	const document = useDocument(collectionName, id);

	return (
		<div className="flex h-full flex-col w-full flex-1">
			{document.isLoading ? null : (
				<DocumentEditor
					document={document.data}
					schema={schema}
					id={id}
					collectionId={collectionName}
				/>
			)}
		</div>
	);
}
