import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowDownIcon,
    ArrowUpIcon,
    FireIcon,
    FlagIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { PriorityType } from '../../entities/Task';

interface PriorityQuickButtonProps {
    value: PriorityType | number;
    onChange: (value: PriorityType) => void | Promise<void>;
    className?: string;
    buttonClassName?: string;
    iconClassName?: string;
    showLabel?: boolean;
    stopPropagation?: boolean;
}

const normalizePriority = (value: PriorityType | number): PriorityType => {
    if (typeof value === 'number') {
        return (['low', 'medium', 'high'][value] as PriorityType) ?? null;
    }
    return value ?? null;
};

const PriorityQuickButton: React.FC<PriorityQuickButtonProps> = ({
    value,
    onChange,
    className = '',
    buttonClassName = '',
    iconClassName = 'h-4 w-4',
    showLabel = false,
    stopPropagation = true,
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0, width: 176 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const normalizedValue = normalizePriority(value);

    const options: Array<{
        value: PriorityType;
        label: string;
        icon: React.ReactNode;
        iconClass: string;
    }> = [
        {
            value: null,
            label: t('priority.none', 'None'),
            icon: <XMarkIcon className="h-4 w-4" />,
            iconClass: 'text-gray-400 dark:text-gray-500',
        },
        {
            value: 'low',
            label: t('priority.low', 'Low'),
            icon: <ArrowDownIcon className="h-4 w-4" />,
            iconClass: 'text-blue-500 dark:text-blue-400',
        },
        {
            value: 'medium',
            label: t('priority.medium', 'Medium'),
            icon: <ArrowUpIcon className="h-4 w-4" />,
            iconClass: 'text-orange-500 dark:text-orange-400',
        },
        {
            value: 'high',
            label: t('priority.high', 'High'),
            icon: <FireIcon className="h-4 w-4" />,
            iconClass: 'text-red-500 dark:text-red-400',
        },
    ];

    const selectedOption =
        options.find((option) => option.value === normalizedValue) ?? options[0];

    const openMenu = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const menuWidth = 176;
            setPosition({
                top: rect.bottom + 8,
                left: Math.max(
                    12,
                    Math.min(rect.left, window.innerWidth - menuWidth - 12)
                ),
                width: menuWidth,
            });
        }
        setIsOpen(true);
    };

    const handleSelect = async (priority: PriorityType) => {
        setIsSaving(true);
        try {
            await onChange(priority);
            setIsOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                buttonRef.current?.contains(target) ||
                menuRef.current?.contains(target)
            ) {
                return;
            }
            setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <span className={className}>
            <button
                ref={buttonRef}
                type="button"
                onClick={(event) => {
                    if (stopPropagation) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    if (!isSaving) {
                        isOpen ? setIsOpen(false) : openMenu();
                    }
                }}
                disabled={isSaving}
                className={buttonClassName}
                title={t('forms.priority', 'Priority')}
                aria-label={t('forms.priority', 'Priority')}
            >
                {normalizedValue ? (
                    <span className={selectedOption.iconClass}>
                        {React.cloneElement(selectedOption.icon as React.ReactElement, {
                            className: iconClassName,
                        })}
                    </span>
                ) : (
                    <FlagIcon className={`${iconClassName} text-gray-400 dark:text-gray-500`} />
                )}
                {showLabel && (
                    <span className="ml-1.5 text-xs font-medium">
                        {selectedOption.label}
                    </span>
                )}
            </button>
            {isOpen &&
                createPortal(
                    <div
                        ref={menuRef}
                        className="fixed z-[10050] rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                        style={{
                            top: position.top,
                            left: position.left,
                            width: position.width,
                        }}
                    >
                        {options.map((option) => (
                            <button
                                key={option.value ?? 'none'}
                                type="button"
                                onClick={(event) => {
                                    if (stopPropagation) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                    }
                                    void handleSelect(option.value);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
                            >
                                <span className={option.iconClass}>
                                    {option.icon}
                                </span>
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </span>
    );
};

export default PriorityQuickButton;
