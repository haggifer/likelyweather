// From `sm` up, an ancestor of a `data-fill-height` element passes the window's free height down to it: it becomes a
// flex column that grows. Without such an element inside, the ancestor keeps its own layout.
export const FILL_HEIGHT_PARENT =
    'sm:has-[[data-fill-height]]:flex sm:has-[[data-fill-height]]:grow sm:has-[[data-fill-height]]:flex-col'
