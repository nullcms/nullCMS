export interface BaseDocument {
	_id: string;
	_createdAt?: Date;
	_updatedAt?: Date;
	_publishedAt?: Date;
	title?: string;
}

export type Document<
	T extends Record<string, unknown> = Record<string, unknown>,
> = BaseDocument & T;
