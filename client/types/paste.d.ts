export interface PasteResponse {
    message: string
    content?: { content: string }
    token?: string
}

export interface AllPasteStoreState {
    content: string,
    token: string
}

export interface AllPasteResponse {
    message: string
    data: AllPasteStoreState[] | []
}

export interface CreatePaste {
    content: string
}

export interface GetAndDelPasteContent {
    token: string
}
