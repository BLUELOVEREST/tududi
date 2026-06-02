import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    UserIcon,
    Bars3Icon,
    BoltIcon,
    InboxIcon,
} from '@heroicons/react/24/solid';
import {
    ArrowPathIcon,
    EnvelopeIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import PomodoroTimer from './Shared/PomodoroTimer';
import UniversalSearch from './UniversalSearch/UniversalSearch';
import NotificationsDropdown from './Notifications/NotificationsDropdown';
import { getApiPath, getAssetPath } from '../config/paths';
import { getFeatureFlags, FeatureFlags } from '../utils/featureFlags';
import { setUserTimezone } from '../utils/dateUtils';
import { useToast } from './Shared/ToastContext';
import {
    backfillNotionEvents,
    NotionBackfillResult,
} from '../utils/notionSyncService';

interface NavbarProps {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    currentUser: {
        email: string;
        avatar_image?: string;
        is_admin?: boolean;
    };
    setCurrentUser: React.Dispatch<React.SetStateAction<any>>;
    isSidebarOpen: boolean;
    setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Navbar: React.FC<NavbarProps> = ({
    currentUser,
    setCurrentUser,
    isSidebarOpen,
    setIsSidebarOpen,
    isDarkMode,
}) => {
    const { t } = useTranslation();
    const { showSuccessToast, showErrorToast } = useToast();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSyncPanelOpen, setIsSyncPanelOpen] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<NotionBackfillResult | null>(
        null
    );
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const [pomodoroEnabled, setPomodoroEnabled] = useState(true); // Default to true
    const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
        backups: false,
        calendar: false,
        caldav: false,
        habits: false,
        mcp: false,
    });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const syncPanelRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    // Dispatch event when mobile search state changes
    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent('mobileSearchToggle', {
                detail: { isOpen: isMobileSearchOpen },
            })
        );
    }, [isMobileSearchOpen]);

    // Listen for close mobile search events
    useEffect(() => {
        const handleCloseMobileSearch = () => {
            setIsMobileSearchOpen(false);
        };

        window.addEventListener('closeMobileSearch', handleCloseMobileSearch);

        return () => {
            window.removeEventListener(
                'closeMobileSearch',
                handleCloseMobileSearch
            );
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
            if (
                syncPanelRef.current &&
                !syncPanelRef.current.contains(event.target as Node)
            ) {
                setIsSyncPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Fetch user's pomodoro setting and feature flags
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(getApiPath('profile'), {
                    credentials: 'include',
                });
                if (response.ok) {
                    const profile = await response.json();
                    setPomodoroEnabled(
                        profile.pomodoro_enabled !== undefined
                            ? profile.pomodoro_enabled
                            : true
                    );
                    // Set user timezone for date formatting
                    if (profile.timezone) {
                        setUserTimezone(profile.timezone);
                    }
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
                // Keep default value (true) if fetch fails
            }
        };

        const fetchFlags = async () => {
            const flags = await getFeatureFlags();
            setFeatureFlags(flags);
        };

        fetchProfile();
        fetchFlags();

        // Listen for Pomodoro setting changes from ProfileSettings
        const handlePomodoroSettingChange = (event: CustomEvent) => {
            setPomodoroEnabled(event.detail.enabled);
        };

        window.addEventListener(
            'pomodoroSettingChanged',
            handlePomodoroSettingChange as EventListener
        );

        return () => {
            window.removeEventListener(
                'pomodoroSettingChanged',
                handlePomodoroSettingChange as EventListener
            );
        };
    }, []);

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleLogout = async () => {
        try {
            const response = await fetch(getApiPath('logout'), {
                method: 'GET',
                credentials: 'include',
            });

            if (response.ok) {
                setCurrentUser(null);
                navigate('/login');
            } else {
                console.error('Logout failed:', await response.json());
            }
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    const formatSyncResult = (result: NotionBackfillResult) =>
        `Total ${result.total}, synced ${result.synced}, skipped ${result.skipped}, errors ${result.errors.length}`;

    const handleNotionBackfill = async (dryRun: boolean) => {
        setIsSyncing(true);
        try {
            const result = await backfillNotionEvents({
                limit: 200,
                dryRun,
            });
            setSyncResult(result);

            if (dryRun) {
                showSuccessToast(
                    `Notion dry run complete. ${formatSyncResult(result)}`
                );
                return;
            }

            showSuccessToast(
                `Notion sync complete. ${formatSyncResult(result)}`
            );
            window.dispatchEvent(new CustomEvent('forceInboxReload'));
            window.dispatchEvent(new CustomEvent('notionBackfillCompleted'));
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Failed to sync Notion events.';
            showErrorToast(message);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-md">
            {/* Main navbar row */}
            <div className="h-16 flex items-center justify-between">
                {/* Sidebar-width area with logo and hamburger */}
                <div
                    className={`${isSidebarOpen ? 'sm:w-72' : 'w-auto sm:w-16'} flex items-center ${isSidebarOpen ? 'sm:justify-center' : 'sm:justify-start'} transition-all duration-300 ease-in-out px-4 relative flex-shrink-0`}
                >
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`flex items-center focus:outline-none text-gray-500 dark:text-gray-500 ${isSidebarOpen ? 'sm:absolute sm:left-4' : 'sm:relative'}`}
                        aria-label={
                            isSidebarOpen
                                ? 'Collapse Sidebar'
                                : 'Expand Sidebar'
                        }
                    >
                        <Bars3Icon className="h-6 mt-1 w-6" />
                    </button>

                    <Link
                        to="/"
                        className={`flex items-center no-underline ml-2 ${isSidebarOpen ? 'sm:ml-0' : 'sm:ml-2'}`}
                    >
                        <img
                            src={getAssetPath(
                                isDarkMode
                                    ? 'wide-logo-light.png'
                                    : 'wide-logo-dark.png'
                            )}
                            alt="tududi"
                            className="h-9 w-auto"
                        />
                    </Link>
                </div>

                {/* Center section - Universal Search (hidden on mobile) */}
                <div className="hidden md:flex flex-1 justify-center px-4">
                    <UniversalSearch />
                </div>

                {/* Right section - Actions and user menu */}
                <div className="flex items-center justify-end space-x-2 sm:space-x-4 px-4 sm:px-6 lg:px-8 flex-shrink-0">
                    {/* Mobile search toggle button */}
                    <button
                        onClick={() =>
                            setIsMobileSearchOpen(!isMobileSearchOpen)
                        }
                        className="md:hidden flex items-center bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full focus:outline-none transition-all duration-200 p-2"
                        aria-label="Toggle Search"
                        title="Search"
                    >
                        <MagnifyingGlassIcon className="h-5 w-5" />
                    </button>

                    <button
                        onClick={() => navigate('/inbox')}
                        className="flex items-center bg-blue-500 hover:bg-blue-600 text-white rounded-full focus:outline-none transition-all duration-200 px-2 py-2 md:px-3 md:py-2"
                        aria-label="Quick Inbox Capture"
                        title="Quick Inbox Capture"
                    >
                        <BoltIcon className="h-4 w-4 text-white" />
                        <InboxIcon className="hidden md:inline-block ml-1.5 h-4 w-4 text-blue-200" />
                    </button>
                    {pomodoroEnabled && <PomodoroTimer />}

                    <NotificationsDropdown isDarkMode={isDarkMode} />

                    <div className="relative" ref={syncPanelRef}>
                        <button
                            onClick={() =>
                                setIsSyncPanelOpen((value) => !value)
                            }
                            className={`flex items-center rounded-full focus:outline-none transition-all duration-200 p-2 ${
                                isSyncPanelOpen
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                            }`}
                            aria-label="Sync Notion"
                            title="Sync Notion"
                        >
                            <ArrowPathIcon
                                className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`}
                            />
                        </button>

                        {isSyncPanelOpen && (
                            <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 p-4 text-gray-900 dark:text-gray-100">
                                <div className="mb-3">
                                    <div className="text-sm font-semibold">
                                        {t('notionSync.title', 'Sync Notion')}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                                        {t(
                                            'notionSync.description',
                                            'Backfill Notion events into Tududi inbox and tasks.'
                                        )}
                                    </div>
                                </div>

                                {syncResult && (
                                    <div className="mb-3 rounded-md bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                                        <div>
                                            Total {syncResult.total} · Synced{' '}
                                            {syncResult.synced} · Skipped{' '}
                                            {syncResult.skipped}
                                        </div>
                                        {syncResult.errors.length > 0 && (
                                            <div className="text-red-600 dark:text-red-300">
                                                Errors:{' '}
                                                {syncResult.errors.length}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleNotionBackfill(true)
                                        }
                                        disabled={isSyncing}
                                        className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {t('notionSync.dryRun', 'Dry run')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleNotionBackfill(false)
                                        }
                                        disabled={isSyncing}
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSyncing && (
                                            <ArrowPathIcon className="mr-2 h-4 w-4 animate-spin" />
                                        )}
                                        {t('notionSync.syncNow', 'Sync now')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={toggleDropdown}
                            className="flex items-center focus:outline-none"
                            aria-label="User Menu"
                        >
                            {currentUser?.avatar_image ? (
                                <img
                                    src={getApiPath(currentUser.avatar_image)}
                                    alt="User Avatar"
                                    className="h-8 w-8 rounded-full object-cover border-2 border-green-500"
                                />
                            ) : (
                                <div className="h-8 w-8 rounded-full border-2 border-green-500 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                    <UserIcon className="h-6 w-6 text-gray-500 dark:text-gray-300" />
                                </div>
                            )}
                        </button>
                        {isDropdownOpen && (
                            <div
                                ref={dropdownRef}
                                className="absolute right-0 top-full mt-2 min-w-48 w-max bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 border border-gray-200 dark:border-gray-700"
                            >
                                {currentUser?.email && (
                                    <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600 flex items-center">
                                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                                        {currentUser.email}
                                    </div>
                                )}
                                <Link
                                    to="/profile"
                                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setIsDropdownOpen(false)}
                                >
                                    {t(
                                        'navigation.profileSettings',
                                        'Profile Settings'
                                    )}
                                </Link>
                                {featureFlags.backups && (
                                    <Link
                                        to="/backup"
                                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        {t(
                                            'navigation.backupRestore',
                                            'Backup & Restore'
                                        )}
                                    </Link>
                                )}
                                {currentUser?.is_admin === true && (
                                    <Link
                                        to="/admin/users"
                                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        {t('admin.manageUsers', 'Manage users')}
                                    </Link>
                                )}
                                <Link
                                    to="/about"
                                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() => setIsDropdownOpen(false)}
                                >
                                    {t('navigation.about', 'About')}
                                </Link>
                                <hr className="my-1 border-gray-200 dark:border-gray-600" />
                                <button
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                    {t('navigation.logout', 'Logout')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile search bar - toggleable on mobile with fade animation */}
            <div
                className={`md:hidden border-t border-gray-200 dark:border-gray-700 px-4 overflow-hidden transition-all duration-300 ease-in-out ${
                    isMobileSearchOpen
                        ? 'max-h-20 py-2 opacity-100'
                        : 'max-h-0 py-0 opacity-0'
                }`}
            >
                <UniversalSearch />
            </div>
        </nav>
    );
};

export default Navbar;
