export interface BaseDocument {
    _id: string;
    _createdAt?: Date;
    _updatedAt?: Date;
    _publishedAt?: Date;
}

export type Document<T extends Record<string, any> = Record<string, any>> = BaseDocument & T;
