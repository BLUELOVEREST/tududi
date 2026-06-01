export interface InboxItem {
    id?: number;
    uid?: string;
    content: string;
    title?: string | null;
    status?: string; // 'added' | 'processed' | 'deleted'
    source?: string; // 'telegram'
    notion_page_id?: string | null;
    notion_url?: string | null;
    notion_synced_at?: string | null;
    notion_last_edited_time?: string | null;
    notion_sync_status?: 'pending' | 'synced' | 'error' | null;
    notion_sync_error?: string | null;
    created_at?: string;
    updated_at?: string;
}
