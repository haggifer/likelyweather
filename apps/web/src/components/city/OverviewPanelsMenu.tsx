'use client'

import { Button } from '@/components/ui/button'
import { Popover, PopoverPanel, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/cn'
import {
    Announcements,
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    Modifier,
    PointerSensor,
    UniqueIdentifier,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
    DEFAULT_OVERVIEW_PANELS,
    getVisiblePanels,
    movePanelTo,
    OverviewPanels,
    PanelVariable,
    togglePanel,
} from '@fa/shared/overview-panels'
import { Eye, EyeOff, GripVertical, SlidersHorizontal } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface RowProps {
    variable: PanelVariable
    isShown: boolean
    isToggleDisabled: boolean
    onToggle: (variable: PanelVariable) => void
}

// A small pointer movement before a drag starts, so a click on the handle stays a click.
const DRAG_DISTANCE = 4

// The list is one column, so a held row only moves up and down.
const lockToVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 })
const MODIFIERS = [lockToVertical]

const PanelRow = ({ variable, isShown, isToggleDisabled, onToggle }: RowProps) => {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')

    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
        id: variable,
    })

    const name = tv(variable)

    return (
        <li
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn('flex items-center gap-1 rounded-md', isDragging && 'relative z-10 bg-muted shadow-sm')}
        >
            <Button
                ref={setActivatorNodeRef}
                type="button"
                variant="ghost"
                size="icon"
                {...attributes}
                {...listeners}
                aria-label={t('dragPanel', { name })}
                className="cursor-grab touch-none rounded-md text-muted-foreground active:cursor-grabbing pointer-coarse:size-10"
            >
                <GripVertical className="size-4" />
            </Button>
            <span className={cn('min-w-0 flex-1', !isShown && 'text-muted-foreground')}>{name}</span>
            <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t(isShown ? 'hidePanel' : 'showPanel', { name })}
                disabled={isToggleDisabled}
                onClick={() => onToggle(variable)}
                className="pointer-coarse:size-10"
            >
                {isShown ? <Eye className="text-primary" /> : <EyeOff className="text-muted-foreground" />}
            </Button>
        </li>
    )
}

interface IProps {
    panels: OverviewPanels
    onChange: (update: (panels: OverviewPanels) => OverviewPanels) => void
    // The overview's controls row is full on phones, so the button keeps only its icon there.
    isLabelHiddenOnPhones?: boolean
    className?: string
}

// Which panels show and in which order (author, 2026-10-13): each row drags by its handle and shows or hides with its
// eye. The keyboard drags too (Space on the handle, the arrows, Space again), with the moves read out to screen
// readers. The last shown panel stays.
export function OverviewPanelsMenu({ panels, onChange: setPanels, isLabelHiddenOnPhones = false, className }: IProps) {
    const t = useTranslations('overview')
    const tv = useTranslations('variables')

    const [isDragging, setIsDragging] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: DRAG_DISTANCE } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    const visibleCount = getVisiblePanels(panels).length

    const getName = (id: UniqueIdentifier) => tv(id as PanelVariable)
    const getPosition = (id: UniqueIdentifier) => panels.order.indexOf(id as PanelVariable) + 1
    const announcements: Announcements = {
        onDragStart: ({ active }) => t('pickedUp', { name: getName(active.id) }),
        onDragOver: ({ active, over }) =>
            over
                ? t('movedTo', { name: getName(active.id), position: getPosition(over.id), count: panels.order.length })
                : undefined,
        onDragEnd: ({ active, over }) =>
            over
                ? t('dropped', { name: getName(active.id), position: getPosition(over.id), count: panels.order.length })
                : undefined,
        onDragCancel: ({ active }) => t('dragCancelled', { name: getName(active.id) }),
    }

    const handleToggle = (variable: PanelVariable) => setPanels((p) => togglePanel(p, variable))
    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        setIsDragging(false)

        if (over)
            setPanels((p) => movePanelTo(p, active.id as PanelVariable, p.order.indexOf(over.id as PanelVariable)))
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" title={t('customize')} className={cn('max-sm:text-sm', className)}>
                    <SlidersHorizontal />
                    <span className={cn(isLabelHiddenOnPhones && 'max-sm:sr-only')}>{t('panels')}</span>
                </Button>
            </PopoverTrigger>
            {/* Escape cancels a keyboard drag before it would close the menu. */}
            <PopoverPanel aria-label={t('customizeTitle')} onEscapeKeyDown={(e) => isDragging && e.preventDefault()}>
                <p className="mb-2 font-semibold">{t('customizeTitle')}</p>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={MODIFIERS}
                    accessibility={{ announcements, screenReaderInstructions: { draggable: t('dragInstructions') } }}
                    onDragStart={() => setIsDragging(true)}
                    onDragCancel={() => setIsDragging(false)}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={panels.order} strategy={verticalListSortingStrategy}>
                        <ul className="flex flex-col gap-1">
                            {panels.order.map((variable) => {
                                const isShown = !panels.hidden.includes(variable)

                                return (
                                    <PanelRow
                                        key={variable}
                                        variable={variable}
                                        isShown={isShown}
                                        isToggleDisabled={isShown && visibleCount === 1}
                                        onToggle={handleToggle}
                                    />
                                )
                            })}
                        </ul>
                    </SortableContext>
                </DndContext>
                <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full max-sm:text-sm"
                    onClick={() => setPanels(() => DEFAULT_OVERVIEW_PANELS)}
                >
                    {t('resetPanels')}
                </Button>
            </PopoverPanel>
        </Popover>
    )
}
