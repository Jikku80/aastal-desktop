'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, usersApi, branchesApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import {
  Plus, X, Loader2, CheckCircle, Clock, AlertCircle,
  Ban, ChevronDown, ChevronUp, Search, Filter, User, GitBranch,
  Circle, Calendar, Flag, MoreVertical, Trash2, Edit2,
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns';
import Header from '@/components/layout/Header';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


// ── Types ─────────────────────────────────────────────────────────────────────
type TaskStatus   = 'pending' | 'ongoing' | 'completed' | 'cancelled';
type TaskPriority = 'low' | 'medium' | 'high';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToUserId?: string;
  assignedToBranchId?: string;
  assignedToUser?:   { id: string; firstName: string; lastName: string };
  assignedToBranch?: { id: string; name: string };
  dueDate?: string;
  completionNote?: string;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: any; color: string; bg: string; border: string }> = {
  pending:   { label: 'Pending',   icon: Circle,      color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30' },
  ongoing:   { label: 'In Progress', icon: Clock,     color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/30' },
  cancelled: { label: 'Cancelled', icon: Ban,         color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; dotColor: string }> = {
  low:    { label: 'Low',    color: 'text-slate-400',  dotColor: 'bg-slate-400' },
  medium: { label: 'Medium', color: 'text-amber-400',  dotColor: 'bg-amber-400' },
  high:   { label: 'High',   color: 'text-red-400',    dotColor: 'bg-red-400' },
};

function dueDateLabel(date?: string) {
  if (!date) return null;
  const d = parseISO(date);
  if (isToday(d))    return { text: 'Due today',    color: 'text-amber-400' };
  if (isTomorrow(d)) return { text: 'Due tomorrow', color: 'text-blue-400' };
  if (isPast(d))     return { text: `Overdue — ${format(d, 'MMM d')}`, color: 'text-red-400' };
  return { text: `Due ${format(d, 'MMM d')}`, color: 'text-[var(--text-muted)]' };
}

// ── Task Form Modal ───────────────────────────────────────────────────────────
function TaskModal({ onClose, task }: { onClose: () => void; task?: Task }) {
  const qc = useQueryClient();
  const { branches } = useAuthStore();

  const [title,       setTitle]       = useState(task?.title       || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority,    setPriority]    = useState<TaskPriority>(task?.priority || 'medium');
  const [assignType,  setAssignType]  = useState<'user' | 'branch'>(task?.assignedToBranchId ? 'branch' : 'user');
  const [userId,      setUserId]      = useState(task?.assignedToUserId   || '');
  const [branchId,    setBranchId]    = useState(task?.assignedToBranchId || '');
  const [dueDate,     setDueDate]     = useState(task?.dueDate || '');

  const { data: staffData } = useQuery({
    queryKey: ['staff-for-tasks'],
    queryFn:  () => usersApi.listStaff({ limit: 100 }).then(r => r.data),
  });
  const staff = staffData?.data || [];

  const mut = useMutation({
    mutationFn: () => {
      const dto = {
        title, description: description || undefined,
        priority,
        assignedToUserId:   assignType === 'user'   ? userId   || undefined : undefined,
        assignedToBranchId: assignType === 'branch' ? branchId || undefined : undefined,
        dueDate: dueDate || undefined,
      };
      return task
        ? tasksApi.update(task.id, dto)
        : tasksApi.create(dto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task-stats'] });
      toast.success(task ? 'Task updated' : 'Task created');
      onClose();
    },
    onError: () => toast.error('Failed to save task'),
  });

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <h2 className="font-semibold text-[var(--text-primary)]">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="btn-ghost w-9 h-9 p-0 justify-center"><X size={17} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="label">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="input w-full" placeholder="What needs to be done?" />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              className="input w-full resize-none" placeholder="Additional details…" />
          </div>

          {/* Priority + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label flex items-center gap-1"><Flag size={12} /> Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="input w-full text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label flex items-center gap-1"><Calendar size={12} /> Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="input w-full text-sm" />
            </div>
          </div>

          {/* Assign to */}
          <div>
            <label className="label">Assign To</label>
            <div className="flex gap-2 mb-2">
              {(['user', 'branch'] as const).map(t => (
                <button key={t} type="button" onClick={() => setAssignType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    assignType === t
                      ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)]'
                  }`}>
                  {t === 'user' ? <User size={12} /> : <GitBranch size={12} />}
                  {t === 'user' ? 'Staff Member' : 'Branch'}
                </button>
              ))}
            </div>

            {assignType === 'user' && (
              <select value={userId} onChange={e => setUserId(e.target.value)} className="input w-full text-sm">
                <option value="">— Unassigned —</option>
                {staff.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role})</option>
                ))}
              </select>
            )}
            {assignType === 'branch' && (
              <select value={branchId} onChange={e => setBranchId(e.target.value)} className="input w-full text-sm">
                <option value="">— No branch —</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="button" onClick={() => mut.mutate()} disabled={!title.trim() || mut.isPending}
              className="btn-primary flex-1 justify-center">
              {mut.isPending ? <Loader2 size={14} className="animate-spin" /> : task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Status Update Modal ───────────────────────────────────────────────────────
function StatusModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus]       = useState<TaskStatus>(task.status);
  const [note,   setNote]         = useState(task.completionNote || '');

  const mut = useMutation({
    mutationFn: () => tasksApi.updateStatus(task.id, { status, completionNote: note || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task-stats'] });
      toast.success('Status updated');
      onClose();
    },
    onError: () => toast.error('Failed to update status'),
  });

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[var(--text-primary)]">Update Status</h3>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 justify-center"><X size={15} /></button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] truncate">{task.title}</p>

        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(STATUS_CONFIG) as [TaskStatus, typeof STATUS_CONFIG[TaskStatus]][]).map(([key, cfg]) => (
            <button key={key} type="button" onClick={() => setStatus(key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                status === key
                  ? `${cfg.bg} ${cfg.border} ${cfg.color} border`
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
              }`}>
              <cfg.icon size={14} />
              {cfg.label}
            </button>
          ))}
        </div>

        {(status === 'completed' || status === 'cancelled') && (
          <div>
            <label className="label text-xs">Note (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              className="input w-full text-sm resize-none" placeholder="Add a completion or cancellation note…" />
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={() => mut.mutate()} disabled={mut.isPending} className="btn-primary flex-1 justify-center">
            {mut.isPending ? <Loader2 size={13} className="animate-spin" /> : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onStatusClick, onEditClick }: { task: Task; onStatusClick: (t: Task) => void; onEditClick: (t: Task) => void }) {
  const qc = useQueryClient();
  const cfg = STATUS_CONFIG[task.status];
  const pri = PRIORITY_CONFIG[task.priority];
  const due = dueDateLabel(task.dueDate);
  const [showMenu, setShowMenu] = useState(false);

  const deleteMut = useMutation({
    mutationFn: () => tasksApi.delete(task.id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['task-stats'] }); toast.success('Task deleted'); },
    onError:    () => toast.error('Failed to delete'),
  });

  const assignedTo = task.assignedToUser
    ? `${task.assignedToUser.firstName} ${task.assignedToUser.lastName}`
    : task.assignedToBranch?.name;

  return (
    <div className="rounded-xl p-4 space-y-3 transition-shadow hover:shadow-md"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      {/* Top row */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm leading-snug ${task.status === 'completed' ? 'line-through opacity-60 text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">{task.description}</p>
          )}
        </div>
        <div className="relative shrink-0">
          <button onClick={() => setShowMenu(v => !v)} className="btn-ghost w-7 h-7 p-0 justify-center">
            <MoreVertical size={14} />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 z-20 rounded-xl shadow-2xl min-w-[130px] overflow-hidden"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <button onClick={() => { onEditClick(task); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-white/5">
                <Edit2 size={13} /> Edit
              </button>
              <button onClick={() => { onStatusClick(task); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-white/5">
                <Clock size={13} /> Change Status
              </button>
              <button onClick={() => { if (confirm('Delete this task?')) deleteMut.mutate(); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status badge */}
        <button onClick={() => onStatusClick(task)}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-opacity hover:opacity-75 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
          <cfg.icon size={9} /> {cfg.label}
        </button>

        {/* Priority dot */}
        <span className={`flex items-center gap-1 text-[10px] font-medium ${pri.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pri.dotColor}`} />
          {pri.label}
        </span>

        {/* Due date */}
        {due && (
          <span className={`text-[10px] font-medium ${due.color} flex items-center gap-0.5`}>
            <Calendar size={9} /> {due.text}
          </span>
        )}
      </div>

      {/* Assigned to */}
      {assignedTo && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
          {task.assignedToBranchId ? <GitBranch size={11} /> : <User size={11} />}
          <span className="truncate">{assignedTo}</span>
        </div>
      )}

      {/* Completion note */}
      {task.completionNote && (
        <p className="text-[11px] text-[var(--text-muted)] italic border-l-2 border-[var(--border)] pl-2">
          {task.completionNote}
        </p>
      )}
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────

// ── Draggable Card Wrapper ─────────────────────────────────────────────────────
function DraggableTaskCard({ task, onStatusClick, onEditClick }: { task: Task; onStatusClick: (t: Task) => void; onEditClick: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: 'grab',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onStatusClick={onStatusClick} onEditClick={onEditClick} />
    </div>
  );
}

// ── Droppable Column ───────────────────────────────────────────────────────────
function DroppableTaskColumn({ status, tasks, onStatusClick, onEditClick, isOver }: {
  status: TaskStatus; tasks: Task[]; onStatusClick: (t: Task) => void; onEditClick: (t: Task) => void; isOver?: boolean;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className={`flex flex-col gap-3 rounded-2xl transition-colors ${isOver ? 'ring-2 ring-[var(--accent)] ring-offset-1' : ''}`}>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${cfg.bg} ${cfg.border}`}>
        <cfg.icon size={13} className={cfg.color} />
        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.length === 0 ? (
          <div className={`rounded-xl border border-dashed p-6 text-center text-[var(--text-muted)] text-xs min-h-[80px] flex items-center justify-center transition-colors ${isOver ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--border)]'}`}>
            Drop here
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {tasks.map(t => <DraggableTaskCard key={t.id} task={t} onStatusClick={onStatusClick} onEditClick={onEditClick} />)}
          </div>
        )}
      </SortableContext>
    </div>
  );
}

function TaskColumn({ status, tasks, onStatusClick, onEditClick }: {
  status: TaskStatus; tasks: Task[]; onStatusClick: (t: Task) => void; onEditClick: (t: Task) => void;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="flex flex-col gap-3">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${cfg.bg} ${cfg.border}`}>
        <cfg.icon size={13} className={cfg.color} />
        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-[var(--text-muted)] text-xs">
          No {cfg.label.toLowerCase()} tasks
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {tasks.map(t => <TaskCard key={t.id} task={t} onStatusClick={onStatusClick} onEditClick={onEditClick} />)}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const qc = useQueryClient();
  const { activeBranch } = useAuthStore();

  const [showCreate,    setShowCreate]    = useState(false);
  const [editTask,      setEditTask]      = useState<Task | null>(null);
  const [statusTask,    setStatusTask]    = useState<Task | null>(null);
  const [filterStatus,  setFilterStatus]  = useState<string>('active');
  const [filterAssign,  setFilterAssign]  = useState<string>('');
  const [search,        setSearch]        = useState('');

  const [activeTask,    setActiveTask]    = useState<Task | null>(null);
  const [overStatus,    setOverStatus]    = useState<TaskStatus | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const statusMoveMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.updateStatus(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); },
    onError:   () => toast.error('Failed to move task'),
  });

  const handleDragStart = (e: DragStartEvent) => {
    const task = allTasks.find(t => t.id === e.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    setOverStatus(null);
    const { active, over } = e;
    if (!over) return;
    // over.id is either a task id or a column status string
    const targetStatus = (['pending', 'ongoing', 'completed', 'cancelled'] as TaskStatus[])
      .find(s => s === over.id)
      ?? allTasks.find(t => t.id === over.id)?.status;
    const draggedTask = allTasks.find(t => t.id === active.id);
    if (!draggedTask || !targetStatus || draggedTask.status === targetStatus) return;
    statusMoveMut.mutate({ id: draggedTask.id, status: targetStatus });
  };

  const handleDragOver = (e: any) => {
    const { over } = e;
    if (!over) { setOverStatus(null); return; }
    const col = (['pending', 'ongoing', 'completed', 'cancelled'] as TaskStatus[])
      .find(s => s === over.id)
      ?? allTasks.find(t => t.id === over.id)?.status ?? null;
    setOverStatus(col as TaskStatus | null);
  };


  const { data, isLoading } = useQuery({
    queryKey: ['tasks', filterStatus, activeBranch?.id],
    queryFn: () => {
      const params: any = { limit: 200 };
      if (filterStatus !== 'all' && filterStatus !== 'active') params.status = filterStatus;
      if (filterAssign) params.assignedToBranchId = filterAssign;
      return tasksApi.list(params).then(r => r.data);
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['task-stats'],
    queryFn: () => tasksApi.stats().then(r => r.data),
  });

  const allTasks: Task[] = data?.data || [];

  // Filter
  const filtered = allTasks.filter(t => {
    if (filterStatus === 'active' && (t.status === 'completed' || t.status === 'cancelled')) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const byStatus = (s: TaskStatus) => filtered.filter(t => t.status === s);

  const statItems = [
    { key: 'pending',   label: 'Pending',    value: (stats as any)?.pending   ?? 0, color: 'text-amber-400' },
    { key: 'ongoing',   label: 'In Progress', value: (stats as any)?.ongoing   ?? 0, color: 'text-blue-400' },
    { key: 'completed', label: 'Completed',  value: (stats as any)?.completed ?? 0, color: 'text-emerald-400' },
    { key: 'total',     label: 'Total',       value: (stats as any)?.total     ?? 0, color: 'text-[var(--text-primary)]' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-base)]">
      <Header
        title="Task Management"
        subtitle="Assign & track tasks"
        action={{ label: 'New Task', icon: Plus, onClick: () => setShowCreate(true) }}
      />

      <div className="flex-1 p-4 md:p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {statItems.map(s => (
            <div key={s.key} className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 md:p-4">
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide font-medium">{s.label}</p>
              <p className={`text-xl md:text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex-1 min-w-[180px] max-w-[280px]">
            <Search size={13} className="text-[var(--text-muted)] shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
              className="bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] flex-1 min-w-0" />
          </div>

          {/* Status filter */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input text-sm py-2 max-w-[150px]">
            <option value="active">Active tasks</option>
            <option value="all">All tasks</option>
            <option value="pending">Pending only</option>
            <option value="ongoing">In Progress only</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Board — drag-and-drop Kanban */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-[var(--text-secondary)]">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              Loading tasks…
            </div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {(['pending', 'ongoing', 'completed', 'cancelled'] as TaskStatus[]).map(s => (
                (!['completed', 'cancelled'].includes(s) || filterStatus === 'all' || filterStatus === s) && (
                  <DroppableTaskColumn
                    key={s} status={s} tasks={byStatus(s)}
                    onStatusClick={setStatusTask} onEditClick={setEditTask}
                    isOver={overStatus === s}
                  />
                )
              ))}
            </div>
            <DragOverlay>
              {activeTask && (
                <div className="rotate-1 scale-105 shadow-2xl opacity-90">
                  <TaskCard task={activeTask} onStatusClick={() => {}} onEditClick={() => {}} />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Modals */}
      {(showCreate || editTask) && (
        <TaskModal
          task={editTask || undefined}
          onClose={() => { setShowCreate(false); setEditTask(null); }}
        />
      )}
      {statusTask && <StatusModal task={statusTask} onClose={() => setStatusTask(null)} />}
    </div>
  );
}
