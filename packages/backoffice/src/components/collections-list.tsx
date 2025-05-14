"use client";

import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useDocuments } from "@/lib/client";
import { Link } from "@tanstack/react-router";
import { cx } from "class-variance-authority";
import { formatRelative } from "date-fns";
import { FileText, Plus } from "lucide-react";

interface CollectionsPageProps {
	collectionId: string;
}

export function CollectionsList({ collectionId }: CollectionsPageProps) {
	const documents = useDocuments(collectionId);

	if (documents.isLoading) {
		return <div>Loading...</div>;
	}

	return (
		<div className="flex h-full flex-col w-full">
			<header className="border-b px-4 py-2 bg-background z-10">
				<div className="flex items-center justify-between">
					<div className="flex items-center">
						<h1 className="text-xl font-bold">{collectionId}</h1>
					</div>
					<div className="flex items-center gap-2">
						<Button asChild variant="outline" size="icon">
							<Link
								to={"/collection/$name/$id"}
								className="flex"
								params={{ name: collectionId, id: "new" }}
							>
								<Plus className="h-4 w-4" />
							</Link>
						</Button>
					</div>
				</div>
				<p className="text-sm text-muted-foreground">
					{documents.data?.length}{" "}
					{documents.data?.length === 1 ? "item" : "items"}
				</p>
			</header>

			<div className="flex-1 overflow-auto p-6">
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-[400px]">Title</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Last Updated</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{documents.data?.map((doc) => (
								<TableRow
									key={123}
									className="cursor-pointer hover:bg-accent/50"
								>
									<Link
										to={"/collection/$name/$id"}
										className="flex"
										params={{ name: collectionId, id: doc._id }}
									>
										<TableCell className="font-medium flex items-center gap-2">
											<FileText className="h-4 w-4" />
											{doc.title}
										</TableCell>
									</Link>

									<TableCell>
										<div className="flex items-center">
											<div
												className={cx(
													"h-2 w-2 rounded-full mr-2",
													doc._publishedAt ? "bg-green-500" : "bg-yellow-500",
												)}
											/>
											{doc._publishedAt ? "Published" : "Draft"}
										</div>
									</TableCell>

									<TableCell>
										{doc._updatedAt
											? formatRelative(doc._updatedAt, new Date())
											: null}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</div>
		</div>
	);
}
