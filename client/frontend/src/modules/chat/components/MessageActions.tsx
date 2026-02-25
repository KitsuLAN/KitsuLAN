import { Reply, Smile, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { IconButton } from "@/uikit/icon-button";

interface MessageActionsProps {
    isOwn: boolean;
    onReply?: () => void;
    onReact?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

export function MessageActions({ isOwn, onReply, onReact, onEdit, onDelete }: MessageActionsProps) {
    return (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <IconButton size="sm" title="Ответить" onClick={onReply}>
                <Reply size={14} className="text-fg-muted hover:text-fg" />
            </IconButton>

            <IconButton size="sm" title="Реакция" onClick={onReact}>
                <Smile size={14} className="text-fg-muted hover:text-fg" />
            </IconButton>

            {isOwn && (
                <>
                    <IconButton size="sm" title="Редактировать" onClick={onEdit}>
                        <Pencil size={14} className="text-fg-muted hover:text-kitsu-orange" />
                    </IconButton>
                    <IconButton size="sm" title="Удалить" onClick={onDelete} className="hover:bg-kitsu-dnd/10 hover:border-kitsu-dnd">
                        <Trash2 size={14} className="text-fg-muted hover:text-kitsu-dnd" />
                    </IconButton>
                </>
            )}

            <IconButton size="sm" title="Ещё">
                <MoreHorizontal size={14} className="text-fg-muted hover:text-fg" />
            </IconButton>
        </div>
    );
}