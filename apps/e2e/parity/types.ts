// Device pixels, in the coordinates of the screenshot the node was found in.
export interface Rect {
    x: number
    y: number
    width: number
    height: number
}

export interface TextNode {
    text: string
    rect: Rect
    // Which screenshot of the screen holds the node (the app's screen is captured page by page).
    image: number
}
