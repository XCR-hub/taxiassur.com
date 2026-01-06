import { useState, DragEvent } from 'react';
import { GripVertical, Plus, MoreVertical, Trash2, Edit, Calendar, User } from 'lucide-react';

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  tags?: string[];
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  cards: KanbanCard[];
  limit?: number;
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onColumnsChange: (columns: KanbanColumn[]) => void;
  onCardClick?: (card: KanbanCard) => void;
  onCardEdit?: (card: KanbanCard) => void;
  onCardDelete?: (cardId: string, columnId: string) => void;
  onCardAdd?: (columnId: string) => void;
}

export function KanbanBoard({
  columns,
  onColumnsChange,
  onCardClick,
  onCardEdit,
  onCardDelete,
  onCardAdd
}: KanbanBoardProps) {
  const [draggedCard, setDraggedCard] = useState<{ card: KanbanCard; sourceColumnId: string } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (card: KanbanCard, columnId: string) => {
    setDraggedCard({ card, sourceColumnId: columnId });
  };

  const handleDragOver = (e: DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedCard) return;

    const { card, sourceColumnId } = draggedCard;

    if (sourceColumnId === targetColumnId) {
      setDraggedCard(null);
      return;
    }

    const newColumns = columns.map(col => {
      if (col.id === sourceColumnId) {
        return {
          ...col,
          cards: col.cards.filter(c => c.id !== card.id)
        };
      }
      if (col.id === targetColumnId) {
        const targetColumn = columns.find(c => c.id === targetColumnId);
        if (targetColumn?.limit && col.cards.length >= targetColumn.limit) {
          return col;
        }
        return {
          ...col,
          cards: [...col.cards, card]
        };
      }
      return col;
    });

    onColumnsChange(newColumns);
    setDraggedCard(null);
  };

  const priorityColors = {
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    high: 'bg-red-500/10 text-red-500 border-red-500/20'
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(column => (
        <div
          key={column.id}
          className={`
            flex-shrink-0 w-80 bg-gray-900 rounded-xl border border-gray-800
            transition-all duration-200
            ${dragOverColumn === column.id ? 'ring-2 ring-blue-500 ring-opacity-50 scale-[1.02]' : ''}
          `}
          onDragOver={(e) => handleDragOver(e, column.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="text-white font-semibold">{column.title}</h3>
                <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-full font-medium">
                  {column.cards.length}
                  {column.limit && ` / ${column.limit}`}
                </span>
              </div>
              {onCardAdd && (
                <button
                  onClick={() => onCardAdd(column.id)}
                  className="p-1 hover:bg-gray-800 rounded transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-3 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
            {column.cards.map(card => (
              <div
                key={card.id}
                draggable
                onDragStart={() => handleDragStart(card, column.id)}
                onClick={() => onCardClick?.(card)}
                className={`
                  bg-gray-950 rounded-lg p-4 border border-gray-800
                  hover:border-gray-700 transition-all cursor-move
                  hover:shadow-xl hover:scale-[1.02]
                  ${draggedCard?.card.id === card.id ? 'opacity-50' : ''}
                `}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    <h4 className="text-white font-medium text-sm line-clamp-2">
                      {card.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1">
                    {onCardEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCardEdit(card);
                        }}
                        className="p-1 hover:bg-gray-800 rounded transition-colors"
                      >
                        <Edit className="w-3 h-3 text-gray-500" />
                      </button>
                    )}
                    {onCardDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCardDelete(card.id, column.id);
                        }}
                        className="p-1 hover:bg-red-900/20 rounded transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>

                {card.description && (
                  <p className="text-gray-400 text-xs mb-3 line-clamp-2">
                    {card.description}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {card.priority && (
                    <span className={`
                      text-xs px-2 py-1 rounded-full border
                      ${priorityColors[card.priority]}
                    `}>
                      {card.priority}
                    </span>
                  )}
                  {card.tags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  {card.assignee && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{card.assignee}</span>
                    </div>
                  )}
                  {card.dueDate && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(card.dueDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {column.cards.length === 0 && (
              <div className="text-center py-8 text-gray-600 text-sm">
                Glissez une carte ici
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
