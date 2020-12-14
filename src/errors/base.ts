
export class EdgeDBError extends Error {
    source?: Error;

    hasTag(tag: Tag): boolean {
        return tag.isMatching(this)
    }
}

export interface Tag {
    isMatching(err: EdgeDBError): boolean;
}

export type ErrorType = new (msg: string) => EdgeDBError;
