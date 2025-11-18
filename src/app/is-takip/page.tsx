'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useUserRole } from '@/hooks/useUserRole'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  position: number
  case_id?: string
  due_date?: string
  created_at: string
}

interface Case {
  id: string
  title: string
  case_no?: string
}

const statusColumns = [
  { id: 'todo', label: 'Yapılacak', color: 'bg-gray-100' },
  { id: 'in_progress', label: 'Yapılıyor', color: 'bg-blue-100' },
  { id: 'done', label: 'Yapıldı', color: 'bg-green-100' },
]

function TaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-3 md:p-4 lg:p-5 rounded-lg md:rounded-xl border border-gray-100 mb-2 md:mb-3 cursor-grab active:cursor-grabbing hover:border-gray-300 hover:shadow-sm transition-all"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2 md:gap-3">
        <GripVertical className="h-4 w-4 md:h-5 md:w-5 text-gray-300 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5 md:space-y-2">
          <h4 className="font-semibold text-sm md:text-base text-gray-900 leading-tight">{task.title}</h4>
          {task.description && (
            <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{task.description}</p>
          )}
          {task.due_date && (
            <div className="pt-0.5 md:pt-1">
              <span className="inline-flex items-center px-2 md:px-2.5 py-0.5 md:py-1 rounded-md bg-gray-50 text-[10px] md:text-xs font-medium text-gray-600">
                {new Date(task.due_date).toLocaleDateString('tr-TR')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id })
  return <div ref={setNodeRef} className="min-h-[300px] md:min-h-[400px] lg:min-h-[500px]">{children}</div>
}

export default function IsTakipPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const { isReadOnly } = useUserRole()

  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'todo' as 'todo' | 'in_progress' | 'done',
    case_id: '',
    due_date: ''
  })

  const sb = supabaseBrowser()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [tasksResult, casesResult] = await Promise.all([
        sb.from('tasks').select('*').order('position'),
        sb.from('cases').select('id, title, case_no').order('title')
      ])

      setTasks(tasksResult.data || [])
      setCases(casesResult.data || [])
    } catch (error) {
      console.error('Veri yüklenirken hata:', error)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        toast.error('Giriş yapmanız gerekiyor')
        return
      }

      const maxPosition = Math.max(...tasks.filter(t => t.status === taskForm.status).map(t => t.position), 0)

      const { error } = await sb.from('tasks').insert({
        ...taskForm,
        position: maxPosition + 1,
        case_id: taskForm.case_id || null,
        due_date: taskForm.due_date || null,
        created_by: user.id
      })
      if (error) throw error

      toast.success('Görev başarıyla eklendi')
      setTaskForm({ title: '', description: '', status: 'todo', case_id: '', due_date: '' })
      setTaskDialogOpen(false)
      loadData()
    } catch {
      toast.error('Hata')
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      case_id: task.case_id || '',
      due_date: task.due_date || ''
    })
    setTaskDialogOpen(true)
  }

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return

    try {
      const { error } = await sb
        .from('tasks')
        .update({
          title: taskForm.title,
          description: taskForm.description,
          case_id: taskForm.case_id || null,
          due_date: taskForm.due_date || null
        })
        .eq('id', editingTask.id)

      if (error) throw error

      toast.success('Görev güncellendi')
      setTaskForm({ title: '', description: '', status: 'todo', case_id: '', due_date: '' })
      setEditingTask(null)
      setTaskDialogOpen(false)
      loadData()
    } catch {
      toast.error('Hata')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Bu görevi silmek istediğinizden emin misiniz?')) return
    
    try {
      const { error } = await sb.from('tasks').delete().eq('id', taskId)
      if (error) throw error

      toast.success('Görev silindi')
      loadData()
    } catch {
      toast.error('Hata')
    }
  }


  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeTask = tasks.find(t => t.id === active.id)
    if (!activeTask) return

    // Over bir kolon ID'si mi kontrol et
    const overColumnId = statusColumns.find(col => col.id === over.id)
    if (overColumnId) {
      if (activeTask.status !== overColumnId.id) {
        setTasks(prev => prev.map(t => 
          t.id === activeTask.id ? { ...t, status: overColumnId.id as 'todo' | 'in_progress' | 'done' } : t
        ))
      }
      return
    }

    // Over bir task ise
    const overTask = tasks.find(t => t.id === over.id)
    if (!overTask) return
    if (activeTask.status === overTask.status) return

    setTasks(prev => prev.map(t => 
      t.id === activeTask.id ? { ...t, status: overTask.status } : t
    ))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeTask = tasks.find(t => t.id === active.id)
    if (!activeTask) return

    // Over bir kolon ID'si mi kontrol et
    const overColumnId = statusColumns.find(col => col.id === over.id)
    if (overColumnId) {
      if (activeTask.status !== overColumnId.id) {
        try {
          const { error } = await sb
            .from('tasks')
            .update({ status: overColumnId.id })
            .eq('id', activeTask.id)

          if (error) throw error
          toast.success('Görev taşındı')
          await loadData()
    } catch {
      toast.error('Görev taşınamadı')
          await loadData()
        }
      }
      return
    }

    // Over bir task ise
    const overTask = tasks.find(t => t.id === over.id)
    if (!overTask) return

    const oldStatus = activeTask.status
    const newStatus = overTask.status

    if (oldStatus !== newStatus) {
      try {
        const { error } = await sb
          .from('tasks')
          .update({ status: newStatus })
          .eq('id', activeTask.id)

        if (error) throw error
        toast.success('Görev taşındı')
        await loadData()
      } catch {
        toast.error('Görev taşınamadı')
        await loadData()
      }
    } else if (activeTask.id !== overTask.id) {
      const statusTasks = tasks.filter(t => t.status === oldStatus)
      const oldIndex = statusTasks.findIndex(t => t.id === active.id)
      const newIndex = statusTasks.findIndex(t => t.id === over.id)

      if (oldIndex !== newIndex) {
        const reordered = arrayMove(statusTasks, oldIndex, newIndex)
        
        // Optimistik UI güncellemesi
        setTasks(prev => {
          const otherTasks = prev.filter(t => t.status !== oldStatus)
          const updatedReordered = reordered.map((task, idx) => ({
            ...task,
            position: idx
          }))
          return [...otherTasks, ...updatedReordered]
        })

        // Arka planda pozisyonları güncelle
        try {
          const updates = reordered.map((task, idx) => ({
            id: task.id,
            position: idx
          }))

          await Promise.all(
            updates.map(upd =>
              sb.from('tasks').update({ position: upd.position }).eq('id', upd.id)
            )
          )
        } catch {
          toast.error('Sıralama güncellenemedi')
          await loadData()
        }
      }
    }
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter(t => t.status === status).sort((a, b) => a.position - b.position)
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Yükleniyor...</div>
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 text-center md:text-left">İş Takip</h1>
          <p className="text-xs md:text-sm text-gray-600 mt-0.5 hidden md:block">Görevlerinizi yönetin ve takip edin</p>
        </div>
        <Dialog open={taskDialogOpen} onOpenChange={(open) => {
          setTaskDialogOpen(open)
          if (!open) {
            setEditingTask(null)
            setTaskForm({ title: '', description: '', status: 'todo', case_id: '', due_date: '' })
          }
        }}>
          <DialogTrigger asChild>
            {!isReadOnly && (
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">Yeni Görev</span>
                <span className="xs:hidden">Ekle</span>
              </Button>
            )}
          </DialogTrigger>
          <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-lg max-h-[90vh] overflow-y-auto p-4 md:p-6">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">{editingTask ? 'Görevi Düzenle' : 'Yeni Görev Ekle'}</DialogTitle>
              <DialogDescription className="text-xs md:text-sm">
                {editingTask ? 'Görev bilgilerini güncelleyin' : 'Yeni görev bilgilerini girin'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask} className="space-y-4 md:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-xs md:text-sm font-medium text-gray-700">Görev Başlığı *</Label>
                <Input
                  id="title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                  className="h-9 md:h-11 text-sm md:text-base"
                  placeholder="Görev başlığı"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs md:text-sm font-medium text-gray-700">Açıklama</Label>
                <Textarea
                  id="description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Görev açıklaması (opsiyonel)"
                  className="min-h-[80px] md:min-h-[100px] text-sm md:text-base"
                />
              </div>

              {!editingTask && (
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-xs md:text-sm font-medium text-gray-700">Durum *</Label>
                  <Select value={taskForm.status} onValueChange={(value: 'todo' | 'in_progress' | 'done') => setTaskForm({ ...taskForm, status: value })}>
                    <SelectTrigger className="h-9 md:h-11 text-sm md:text-base">
                      <SelectValue placeholder="Durum seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">Yapılacak</SelectItem>
                      <SelectItem value="in_progress">Yapılıyor</SelectItem>
                      <SelectItem value="done">Yapıldı</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="case_id" className="text-xs md:text-sm font-medium text-gray-700">Dosya (Opsiyonel)</Label>
                <Select value={taskForm.case_id || undefined} onValueChange={(value) => setTaskForm({ ...taskForm, case_id: value })}>
                  <SelectTrigger className="h-9 md:h-11 text-sm md:text-base">
                    <SelectValue placeholder="Dosya seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title} {c.case_no ? `(${c.case_no})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-xs md:text-sm font-medium text-gray-700">Bitiş Tarihi</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  className="h-9 md:h-11 text-sm md:text-base"
                />
              </div>

              <div className="pt-2 md:pt-4">
                <Button type="submit" className="w-full h-9 md:h-11 text-sm md:text-base font-medium">
                  {editingTask ? 'Güncelle' : 'Ekle'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
          {statusColumns.map((column) => {
            const columnTasks = getTasksByStatus(column.id)

            return (
              <Card key={column.id} className={column.color}>
                <CardHeader className="pb-3 md:pb-4 lg:pb-6">
                  <CardTitle className="flex items-center justify-between text-sm md:text-base">
                    <span>{column.label}</span>
                    <Badge variant="secondary" className="text-xs">{columnTasks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 md:p-4 lg:p-6">
                  <DroppableColumn id={column.id}>
                    <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {columnTasks.map((task) => (
                        <div key={task.id} className="relative group">
                          <TaskCard task={task} />
                          {!isReadOnly && (
                            <div className="absolute top-1.5 md:top-2 right-1.5 md:right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 md:h-7 md:w-7 p-0 bg-white cursor-pointer"
                                onClick={() => handleEditTask(task)}
                              >
                                <Edit className="h-2.5 w-2.5 md:h-3 md:w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 w-6 md:h-7 md:w-7 p-0 bg-white cursor-pointer text-red-600"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="h-2.5 w-2.5 md:h-3 md:w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                      {columnTasks.length === 0 && (
                        <div className="text-center py-8 md:py-12">
                          <p className="text-gray-400 text-xs md:text-sm">Henüz görev yok</p>
                        </div>
                      )}
                    </SortableContext>
                  </DroppableColumn>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-lg border-2 border-blue-400 max-w-[250px] md:max-w-none">
              <p className="font-medium text-sm md:text-base truncate">
                {tasks.find(t => t.id === activeId)?.title}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

