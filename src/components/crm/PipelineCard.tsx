import React, { useRef, useState } from 'react';
import { Calendar, Tag, TrendingUp, Mail, Phone } from 'lucide-react';
import { CRMLead, PIPELINE_STATUSES } from '@/lib/crm-pipeline';
import { cn } from '@/lib/utils';

interface PipelineCardProps {
  lead: CRMLead;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  className?: string;
}

export const PipelineCard: React.FC<PipelineCardProps> = ({
  lead,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
  className
}) => {
  const statusInfo = PIPELINE_STATUSES[lead.status];
  const isDraggingRef = useRef(false);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);

  const getScoreColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleDragStart = (e: React.DragEvent) => {
    isDraggingRef.current = true;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id);
    onDragStart?.(e);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
    onDragEnd?.(e);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (mouseDownPos.current) {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);
      if (dx > 5 || dy > 5) {
        e.preventDefault();
        return;
      }
    }

    onClick?.();
  };

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Lead: ${lead.full_name} - ${statusInfo.label}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        'bg-white rounded-lg shadow-sm border-2 border-gray-200 p-4 cursor-grab hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500',
        isDragging && 'opacity-50 scale-95 rotate-2 cursor-grabbing',
        'hover:border-blue-300 active:cursor-grabbing',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate text-sm">
            {lead.full_name}
          </h3>
          {lead.company_name && (
            <p className="text-xs text-gray-600 truncate">{lead.company_name}</p>
          )}
        </div>
        {lead.quality_score && (
          <div className={cn('text-xs font-bold ml-2', getScoreColor(lead.quality_score))}>
            {lead.quality_score}%
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-xs text-gray-600">
          <Mail size={12} className="mr-1.5 flex-shrink-0" />
          <span className="truncate">{lead.email}</span>
        </div>

        {lead.phone && (
          <div className="flex items-center text-xs text-gray-600">
            <Phone size={12} className="mr-1.5 flex-shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </div>
        )}

        {lead.city && (
          <div className="flex items-center text-xs text-gray-600">
            <Tag size={12} className="mr-1.5 flex-shrink-0" />
            <span className="truncate">{lead.city}</span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        {lead.last_contact && (
          <div className="flex items-center text-xs text-gray-500">
            <Calendar size={12} className="mr-1" />
            <span>{new Date(lead.last_contact).toLocaleDateString('fr-FR')}</span>
          </div>
        )}

        {lead.retention_score && (
          <div className="flex items-center text-xs">
            <TrendingUp size={12} className="mr-1" />
            <span className={getScoreColor(lead.retention_score)}>
              {lead.retention_score}%
            </span>
          </div>
        )}
      </div>

      {lead.tags && lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
          {lead.tags.length > 2 && (
            <span className="text-xs text-gray-500">+{lead.tags.length - 2}</span>
          )}
        </div>
      )}
    </div>
  );
};
