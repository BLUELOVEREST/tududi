import React, { useState, useEffect, useRef } from 'react';
import {
    ChevronDownIcon,
    PlayIcon,
    PauseCircleIcon,
    CheckIcon,
    ClockIcon,
    XCircleIcon,
    CalendarIcon,
    BeakerIcon,
    Cog6ToothIcon,
    ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { PriorityType, StatusType, Task } from '../../entities/Task';
import {
    isTaskCompleted,
    isTaskInProgress,
    isTaskNotStarted,
    getStatusString,
} from '../../constants/taskStatus';
import {
    getStatusBorderColorClasses,
    getStatusButtonColorClasses,
} from './statusStyles';
import PriorityQuickButton from '../Shared/PriorityQuickButton';

type CompletionMenuTarget = 'desktop' | 'mobile';

interface TaskStatusControlProps {
    task: Task;
    onToggleCompletion?: () => void;
    onTaskUpdate?: (task: Task) => Promise<void>;
    hoverRevealQuickActions?: boolean;
    showMobileVariant?: boolean;
    className?: string;
    variant?: 'pill' | 'square';
    showQuickActions?: boolean;
    showNotionQuickAction?: boolean;
    onMenuOpenChange?: (isOpen: boolean) => void;
}

const quickStartStatuses = new Set([
    'not_started',
    'planned',
    'waiting',
    'cancelled',
]);

const TaskStatusControl: React.FC<TaskStatusControlProps> = ({
    task,
    onToggleCompletion,
    onTaskUpdate,
    hoverRevealQuickActions = true,
    showMobileVariant = true,
    className = '',
    variant = 'square',
    showQuickActions = true,
    showNotionQuickAction = false,
    onMenuOpenChange,
}) => {
    const { t } = useTranslation();
    const [completionMenuOpen, setCompletionMenuOpen] =
        useState<CompletionMenuTarget | null>(null);

    useEffect(() => {
        onMenuOpenChange?.(completionMenuOpen !== null);
    }, [completionMenuOpen, onMenuOpenChange]);
    const [isCompletingTask, setIsCompletingTask] = useState(false);
    const desktopCompletionMenuRef = useRef<HTMLDivElement>(null);
    const mobileCompletionMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!completionMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const activeRef =
                completionMenuOpen === 'desktop'
                    ? desktopCompletionMenuRef.current
                    : mobileCompletionMenuRef.current;

            if (activeRef && activeRef.contains(target)) {
                return;
            }

            setCompletionMenuOpen(null);
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [completionMenuOpen]);

    const taskCompleted = isTaskCompleted(task.status);
    const taskInProgress = isTaskInProgress(task.status);
    const currentStatusString = getStatusString(task.status);

    const completionButtonTextClass = taskCompleted
        ? 'text-green-600 dark:text-green-400'
        : taskInProgress
          ? 'text-blue-600 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400';

    const completionButtonHoverClass = taskCompleted
        ? 'hover:bg-green-50 dark:hover:bg-green-900/40'
        : taskInProgress
          ? 'hover:bg-blue-50 dark:hover:bg-blue-900/40'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800';

    const completionButtonMainBgClass = taskCompleted
        ? 'bg-green-100 dark:bg-green-900/50'
        : taskInProgress
          ? 'bg-blue-100 dark:bg-blue-900/50'
          : 'bg-gray-200 dark:bg-gray-700';

    const completionButtonMainTextClass = taskCompleted
        ? 'text-green-900 dark:text-green-100 font-semibold'
        : taskInProgress
          ? 'text-blue-900 dark:text-blue-100 font-semibold'
          : 'text-gray-900 dark:text-gray-100 font-semibold';

    const isSquareVariant = variant === 'square';
    const textSizeClass = isSquareVariant ? 'text-xs' : 'text-sm';
    const gapClass = isSquareVariant ? 'gap-1.5' : 'gap-2';
    const iconSizeClass = isSquareVariant ? 'h-3.5 w-3.5' : 'h-4 w-4';
    const containerRoundedClass = isSquareVariant
        ? 'rounded-lg'
        : 'rounded-full';
    const completionButtonPaddingClass = isSquareVariant
        ? 'px-2.5 py-1'
        : 'px-3 py-1';
    const quickButtonPaddingClass = isSquareVariant ? 'px-1.5' : 'px-2';
    const hoverPaddingClass = isSquareVariant
        ? 'md:group-hover:px-1.5'
        : 'md:group-hover:px-2';

    const completionButtonMainClasses = `inline-flex items-center ${gapClass} ${textSizeClass} transition ${completionButtonMainTextClass} ${completionButtonMainBgClass} ${completionButtonHoverClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`;

    const completionButtonChevronClasses = `inline-flex items-center justify-center transition ${completionButtonTextClass} ${completionButtonHoverClass} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`;

    const statusButtonColorClasses = getStatusButtonColorClasses(task.status);
    const statusBorderColorClass = getStatusBorderColorClasses(task.status);

    const showQuickStartButton =
        showQuickActions && quickStartStatuses.has(currentStatusString);
    const showQuickCompleteButton =
        showQuickActions && currentStatusString !== 'done';
    const showNotionButton = showNotionQuickAction && !!task.notion_url;

    const handleCompletionClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCompletionMenuOpen(null);

        if (onToggleCompletion) {
            if (!taskCompleted) {
                setIsCompletingTask(true);
                await new Promise((resolve) => setTimeout(resolve, 1200));
            }

            onToggleCompletion();

            setTimeout(() => {
                setIsCompletingTask(false);
            }, 100);
        }
    };

    const handleStatusSelection = async (
        e: React.MouseEvent,
        statusValue: StatusType
    ) => {
        e.preventDefault();
        e.stopPropagation();
        setCompletionMenuOpen(null);
        if (onTaskUpdate && task.id) {
            const updatedTask = {
                ...task,
                status: statusValue,
                // Preserve the original task name if it exists (for recurring tasks)
                // The backend serializer transforms recurring task names to "Daily", "Weekly", etc.
                // but we need to send the actual task name when updating
                name: task.original_name || task.name,
            };
            await onTaskUpdate(updatedTask);
        }
    };

    const handleNotionClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.stopPropagation();
        setCompletionMenuOpen(null);
    };

    const handlePriorityChange = async (priority: PriorityType) => {
        setCompletionMenuOpen(null);
        if (onTaskUpdate && task.id) {
            await onTaskUpdate({
                ...task,
                priority,
                name: task.original_name || task.name,
            });
        }
    };

    const renderStatusMenuOptions = (menuType: CompletionMenuTarget) => {
        const options: StatusDropdownOption[] = [
            {
                value: 'planned',
                label: t('task.status.planned', 'Planned'),
                Icon: ClockIcon,
                activeClasses:
                    'bg-purple-100 dark:bg-purple-900/50 text-purple-900 dark:text-purple-100 font-semibold border-l-2 border-purple-500 dark:border-purple-400',
                inactiveClasses:
                    'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
                activeIconClass: 'text-purple-600 dark:text-purple-300',
                inactiveIconClass: 'text-purple-500 dark:text-purple-400',
            },
            {
                value: 'in_progress',
                label: t('task.status.building', 'Building'),
                Icon: PlayIcon,
                activeClasses:
                    'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 font-semibold border-l-2 border-blue-500 dark:border-blue-400',
                inactiveClasses:
                    'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
                activeIconClass: 'text-blue-600 dark:text-blue-300',
                inactiveIconClass: 'text-blue-500 dark:text-blue-400',
            },
            {
                value: 'validating',
                label: t('task.status.validating', 'Validating'),
                Icon: BeakerIcon,
                activeClasses:
                    'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-900 dark:text-cyan-100 font-semibold border-l-2 border-cyan-500 dark:border-cyan-400',
                inactiveClasses:
                    'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
                activeIconClass: 'text-cyan-600 dark:text-cyan-300',
                inactiveIconClass: 'text-cyan-500 dark:text-cyan-400',
            },
            {
                value: 'optimizing',
                label: t('task.status.optimizing', 'Optimizing'),
                Icon: Cog6ToothIcon,
                activeClasses:
                    'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100 font-semibold border-l-2 border-indigo-500 dark:border-indigo-400',
                inactiveClasses:
                    'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
                activeIconClass: 'text-indigo-600 dark:text-indigo-300',
                inactiveIconClass: 'text-indigo-500 dark:text-indigo-400',
            },
            {
                value: 'waiting',
                label: t('task.status.paused', 'Paused'),
                Icon: ClockIcon,
                activeClasses:
                    'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100 font-semibold border-l-2 border-yellow-500 dark:border-yellow-400',
                inactiveClasses:
                    'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
                activeIconClass: 'text-yellow-600 dark:text-yellow-300',
                inactiveIconClass: 'text-yellow-500 dark:text-yellow-400',
            },
            {
                value: 'cancelled',
                label: t('task.status.cancelled', 'Cancelled'),
                Icon: XCircleIcon,
                activeClasses:
                    'bg-red-100 dark:bg-red-900/50 text-red-900 dark:text-red-100 font-semibold border-l-2 border-red-500 dark:border-red-400',
                inactiveClasses:
                    'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
                activeIconClass: 'text-red-600 dark:text-red-300',
                inactiveIconClass: 'text-red-500 dark:text-red-400',
            },
            {
                value: 'done',
                label: t('tasks.done', 'Done'),
                Icon: CheckIcon,
                activeClasses:
                    'bg-green-100 dark:bg-green-900/50 text-green-900 dark:text-green-100 font-semibold border-l-2 border-green-500 dark:border-green-400',
                inactiveClasses:
                    'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800',
                activeIconClass: 'text-green-600 dark:text-green-300',
                inactiveIconClass: 'text-green-500 dark:text-green-400',
                completion: true,
            },
        ];

        const currentStatus = getStatusString(task.status);

        return options.map((option, index) => {
            const isActive = currentStatus === option.value;
            const roundedClass =
                index === 0
                    ? 'rounded-t-lg'
                    : index === options.length - 1
                      ? 'rounded-b-lg'
                      : '';
            const iconClass = isActive
                ? option.activeIconClass
                : option.inactiveIconClass;
            const stateClasses = isActive
                ? option.activeClasses
                : option.inactiveClasses;

            return (
                <button
                    key={`${menuType}-${option.value}`}
                    type="button"
                    onClick={async (event) => {
                        if (option.completion) {
                            await handleCompletionClick(event);
                        } else {
                            await handleStatusSelection(event, option.value);
                        }
                    }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${roundedClass} ${stateClasses}`}
                    disabled={option.completion ? isCompletingTask : false}
                >
                    <option.Icon className={`h-4 w-4 ${iconClass}`} />
                    <span className="flex-1">{option.label}</span>
                </button>
            );
        });
    };

    const quickButtonBaseClasses = `${completionButtonChevronClasses} ${statusButtonColorClasses} border-l ${statusBorderColorClass} flex transition-all duration-200`;
    const quickButtonClasses = hoverRevealQuickActions
        ? `${quickButtonBaseClasses} ${quickButtonPaddingClass} md:px-0 md:w-0 md:opacity-0 md:pointer-events-none md:border-l-0 ${hoverPaddingClass} md:group-hover:w-auto md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:border-l`
        : `${quickButtonBaseClasses} ${quickButtonPaddingClass}`;

    const quickCompleteClasses = hoverRevealQuickActions
        ? `${completionButtonChevronClasses} ${statusButtonColorClasses} border-l ${statusBorderColorClass} flex transition-all duration-200 ${quickButtonPaddingClass} md:px-0 md:w-0 md:opacity-0 md:pointer-events-none md:border-l-0 ${hoverPaddingClass} md:group-hover:w-auto md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-hover:border-l`
        : `${completionButtonChevronClasses} ${statusButtonColorClasses} border-l ${statusBorderColorClass} flex transition-all duration-200 ${quickButtonPaddingClass}`;

    const statusDisplayConfig: Record<
        ReturnType<typeof getStatusString>,
        {
            label: string;
            Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
        }
    > = {
        not_started: {
            label: t('task.status.notStarted', 'Not started'),
            Icon: PauseCircleIcon,
        },
        planned: {
            label: t('task.status.planned', 'Planned'),
            Icon: CalendarIcon,
        },
        in_progress: {
            label: t('task.status.building', 'Building'),
            Icon: PlayIcon,
        },
        validating: {
            label: t('task.status.validating', 'Validating'),
            Icon: BeakerIcon,
        },
        optimizing: {
            label: t('task.status.optimizing', 'Optimizing'),
            Icon: Cog6ToothIcon,
        },
        waiting: {
            label: t('task.status.paused', 'Paused'),
            Icon: ClockIcon,
        },
        cancelled: {
            label: t('task.status.cancelled', 'Cancelled'),
            Icon: XCircleIcon,
        },
        done: {
            label: t('tasks.done', 'Done'),
            Icon: CheckIcon,
        },
        archived: {
            label: t('task.status.archived', 'Archived'),
            Icon: CheckIcon,
        },
    };

    const statusDisplay =
        statusDisplayConfig[currentStatusString] ||
        statusDisplayConfig.not_started;
    const CompletionIcon = statusDisplay.Icon;
    const completionButtonLabel = statusDisplay.label;

    return (
        <div
            className={`relative ${completionMenuOpen ? 'z-[10000]' : ''} ${className}`}
        >
            <div
                className={`inline-flex items-stretch ${containerRoundedClass} border ${statusBorderColorClass} overflow-hidden ${hoverRevealQuickActions ? 'group' : ''}`}
                ref={desktopCompletionMenuRef}
            >
                <button
                    type="button"
                    onClick={
                        taskInProgress ||
                        (!taskCompleted &&
                            (task.status === 'not_started' ||
                                isTaskNotStarted(task.status)))
                            ? (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                              }
                            : handleCompletionClick
                    }
                    className={`${completionButtonMainClasses} ${completionButtonPaddingClass} ${statusButtonColorClasses}`}
                    title={
                        taskCompleted
                            ? t('common.undo', 'Undo')
                            : completionButtonLabel
                    }
                >
                    <CompletionIcon className={iconSizeClass} />
                    {completionButtonLabel}
                </button>
                {showQuickStartButton && (
                    <button
                        type="button"
                        onClick={async (e) => {
                            await handleStatusSelection(e, 'in_progress');
                        }}
                        className={quickButtonClasses}
                        title={t('tasks.setInProgress', 'Set in progress')}
                    >
                        <PlayIcon className={iconSizeClass} />
                    </button>
                )}
                {showQuickCompleteButton && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCompletionClick(e);
                        }}
                        className={quickCompleteClasses}
                        title={t('tasks.markAsDone', 'Mark as done')}
                        disabled={isCompletingTask}
                    >
                        <CheckIcon
                            className={`${iconSizeClass} transition-all duration-300 ${isCompletingTask ? 'scale-125 text-green-600 dark:text-green-400' : ''}`}
                        />
                    </button>
                )}
                {onTaskUpdate && (
                    <PriorityQuickButton
                        value={task.priority}
                        onChange={handlePriorityChange}
                        buttonClassName={quickButtonClasses}
                        iconClassName={iconSizeClass}
                    />
                )}
                {showNotionButton && (
                    <a
                        href={task.notion_url!}
                        target="_blank"
                        rel="noreferrer"
                        onClick={handleNotionClick}
                        className={quickButtonClasses}
                        title={t('notion.openInNotion', 'Open in Notion')}
                        aria-label={t(
                            'notion.openInNotion',
                            'Open in Notion'
                        )}
                    >
                        <ArrowTopRightOnSquareIcon
                            className={iconSizeClass}
                        />
                    </a>
                )}
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCompletionMenuOpen((prev) =>
                            prev === 'desktop' ? null : 'desktop'
                        );
                    }}
                    className={`${completionButtonChevronClasses} ${quickButtonPaddingClass} border-l ${statusBorderColorClass}`}
                    aria-haspopup="menu"
                    aria-expanded={completionMenuOpen === 'desktop'}
                >
                    <ChevronDownIcon className={iconSizeClass} />
                </button>
            </div>
            {completionMenuOpen === 'desktop' && (
                <div
                    className={`absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border ${statusBorderColorClass} rounded-lg shadow-lg z-[9999] opacity-100`}
                >
                    {renderStatusMenuOptions('desktop')}
                </div>
            )}

            {showMobileVariant && (
                <div
                    className="mt-2 relative block md:hidden"
                    ref={mobileCompletionMenuRef}
                >
                    <div
                        className={`inline-flex items-stretch ${containerRoundedClass} border ${statusBorderColorClass} overflow-hidden text-xs`}
                    >
                        <button
                            type="button"
                            onClick={
                                taskInProgress ||
                                (!taskCompleted &&
                                    (task.status === 'not_started' ||
                                        isTaskNotStarted(task.status)))
                                    ? (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                      }
                                    : handleCompletionClick
                            }
                            className={`${completionButtonMainClasses} px-2 py-1 ${statusButtonColorClasses}`}
                            title={
                                taskCompleted
                                    ? t('common.undo', 'Undo')
                                    : completionButtonLabel
                            }
                        >
                            <CompletionIcon className="h-3.5 w-3.5" />
                            <span className="ml-1">
                                {completionButtonLabel}
                            </span>
                        </button>
                        {showQuickStartButton && (
                            <button
                                type="button"
                                onClick={async (e) => {
                                    await handleStatusSelection(
                                        e,
                                        'in_progress'
                                    );
                                }}
                                className={`${completionButtonChevronClasses} ${statusButtonColorClasses} px-2 border-l ${statusBorderColorClass}`}
                                title={t(
                                    'tasks.setInProgress',
                                    'Set in progress'
                                )}
                            >
                                <PlayIcon className="h-3.5 w-3.5" />
                            </button>
                        )}
                        {showQuickCompleteButton && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCompletionClick(e);
                                }}
                                className={`${isCompletingTask ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : `${completionButtonChevronClasses} ${statusButtonColorClasses}`} px-2 border-l ${statusBorderColorClass} transition-all duration-300`}
                                title={t('tasks.markAsDone', 'Mark as done')}
                                disabled={isCompletingTask}
                            >
                                <CheckIcon
                                    className={`h-3.5 w-3.5 transition-all duration-300 ${isCompletingTask ? 'scale-125 text-green-600 dark:text-green-400' : ''}`}
                                />
                            </button>
                        )}
                        {onTaskUpdate && (
                            <PriorityQuickButton
                                value={task.priority}
                                onChange={handlePriorityChange}
                                buttonClassName={`${completionButtonChevronClasses} ${statusButtonColorClasses} px-2 border-l ${statusBorderColorClass}`}
                                iconClassName="h-3.5 w-3.5"
                            />
                        )}
                        {showNotionButton && (
                            <a
                                href={task.notion_url!}
                                target="_blank"
                                rel="noreferrer"
                                onClick={handleNotionClick}
                                className={`${completionButtonChevronClasses} ${statusButtonColorClasses} px-2 border-l ${statusBorderColorClass}`}
                                title={t(
                                    'notion.openInNotion',
                                    'Open in Notion'
                                )}
                                aria-label={t(
                                    'notion.openInNotion',
                                    'Open in Notion'
                                )}
                            >
                                <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setCompletionMenuOpen((prev) =>
                                    prev === 'mobile' ? null : 'mobile'
                                );
                            }}
                            className={`${completionButtonChevronClasses} px-2 border-l ${statusBorderColorClass}`}
                            aria-haspopup="menu"
                            aria-expanded={completionMenuOpen === 'mobile'}
                        >
                            <ChevronDownIcon className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    {completionMenuOpen === 'mobile' && (
                        <div
                            className={`absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border ${statusBorderColorClass} rounded-lg shadow-lg z-[9999] opacity-100`}
                        >
                            {renderStatusMenuOptions('mobile')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

interface StatusDropdownOption {
    value: StatusType;
    label: string;
    Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    activeClasses: string;
    inactiveClasses: string;
    activeIconClass: string;
    inactiveIconClass: string;
    completion?: boolean;
}

export default TaskStatusControl;
