import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Plus,
  X,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar,
  AlignLeft,
  ListTodo,
  Bell,
  CalendarDays,
  Check,
  Repeat,
  TrendingUp,
  Star,
  Target,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { db, Goal, Subtask, TaskList } from "@/src/lib/db";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { DatePicker } from "../components/DatePicker";
import { ar } from "date-fns/locale";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { useMobileBackHandler } from "../hooks/useMobileBackHandler";
import { Skeleton } from "../components/Skeleton";

const DAYS_OF_WEEK = [
  { id: 0, label: "ح" },
  { id: 1, label: "ن" },
  { id: 2, label: "ث" },
  { id: 3, label: "ر" },
  { id: 4, label: "خ" },
  { id: 5, label: "ج" },
  { id: 6, label: "س" },
];

const REPEAT_OPTIONS = [
  { id: "none", label: "عدم التكرار" },
  { id: "daily", label: "يومياً" },
  { id: "weekly", label: "أسبوعياً" },
  { id: "monthly", label: "شهرياً" },
  { id: "yearly", label: "سنوياً" },
  { id: "custom", label: "مخصص" },
] as const;

export function GoalsPage() {
  const location = useLocation();
  const isActiveRoute = location.pathname === "/goals";
  const [settings, setSettings] = useState<any>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([]);
  const [activeListId, setActiveListId] = useState<string>("all");
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [activeTab, setActiveTab] = useState<"tasks" | "habits">("tasks");
  const [isLoading, setIsLoading] = useState(true);

  const [isAdding, setIsAdding] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{
    type: "list" | "goal";
    id: string;
  } | null>(null);

  useLockBodyScroll(isAdding || !!editingGoal || !!confirmDelete);
  
  useMobileBackHandler(isAdding, () => setIsAdding(false));
  useMobileBackHandler(!!editingGoal, () => setEditingGoal(null));
  useMobileBackHandler(!!confirmDelete, () => setConfirmDelete(null));

  // Form state
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");
  const [reminder, setReminder] = useState<string>("");
  const [repeat, setRepeat] = useState<Goal["repeat"]>("none");
  const [customRepeatDays, setCustomRepeatDays] = useState<number[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [isHabit, setIsHabit] = useState(false);
  const [habitDays, setHabitDays] = useState<number[]>([]);
  const [linkedHabitId, setLinkedHabitId] = useState<string>("");

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadSettings(), loadGoals(), loadTaskLists()]);
      } finally {
        setIsLoading(false);
      }
    };
    loadAll();

    const handleGoalUpdated = () => loadGoals();
    window.addEventListener("goal-updated", handleGoalUpdated);

    return () => {
      window.removeEventListener("goal-updated", handleGoalUpdated);
    };
  }, []);

  const loadSettings = async () => {
    const s = await db.settings.get();
    setSettings(s);
  };

  const handleHideIntro = async () => {
    if (settings) {
      const updated = { ...settings, hideGoalsIntro: true };
      await db.settings.save(updated);
      setSettings(updated);
    }
  };

  const loadGoals = async () => {
    const loadedGoals = await db.goals.getAll();
    setGoals(loadedGoals);
  };

  const loadTaskLists = async () => {
    const loadedLists = await db.taskLists.getAll();
    setTaskLists(loadedLists);
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    const newList: TaskList = {
      id: `tasklist_${Date.now()}`,
      name: newListName.trim(),
      createdAt: Date.now(),
    };
    await db.taskLists.save(newList);
    setNewListName("");
    setIsCreatingList(false);
    await loadTaskLists();
    setActiveListId(newList.id);
  };

  const handleDeleteList = async () => {
    if (activeListId === "all") return;
    const goalsInList = goals.filter((g) => g.listId === activeListId);
    for (const goal of goalsInList) {
      await db.goals.delete(goal.id);
    }
    await db.taskLists.delete(activeListId);
    setActiveListId("all");
    await loadTaskLists();
    await loadGoals();
    setConfirmDelete(null);
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;

    const goal: Goal = {
      id: `goal_${Date.now()}`,
      title: quickAddTitle.trim(),
      type: "general",
      target: 1,
      current: 0,
      createdAt: Date.now(),
      isCompleted: false,
      listId: activeListId !== "all" ? activeListId : undefined,
    };

    await db.goals.save(goal);
    setQuickAddTitle("");
    loadGoals();
  };

  const resetForm = () => {
    setTitle("");
    setDetails("");
    setStartDate("");
    setDeadline("");
    setReminder("");
    setRepeat("none");
    setCustomRepeatDays([]);
    setSubtasks([]);
    setNewSubtask("");
    setIsHabit(false);
    setHabitDays([]);
    setLinkedHabitId("");
    setEditingGoal(null);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDetails(goal.details || "");
    setStartDate(
      goal.startDate
        ? format(new Date(goal.startDate), "yyyy-MM-dd'T'HH:mm")
        : "",
    );
    setDeadline(
      goal.deadline
        ? format(new Date(goal.deadline), "yyyy-MM-dd'T'HH:mm")
        : "",
    );
    setReminder(
      goal.reminder
        ? format(new Date(goal.reminder), "yyyy-MM-dd'T'HH:mm")
        : "",
    );
    setRepeat(goal.repeat || "none");
    setCustomRepeatDays(goal.customRepeatDays || []);
    setSubtasks(goal.subtasks || []);
    setIsHabit(goal.isHabit || false);
    setHabitDays(goal.habitDays || []);
    setLinkedHabitId(goal.linkedHabitId || "");
    setIsAdding(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    const goal: Goal = {
      id: editingGoal ? editingGoal.id : `goal_${Date.now()}`,
      title: title.trim(),
      details: details.trim(),
      type: "general",
      target: 1,
      current: editingGoal ? editingGoal.current : 0,
      createdAt: editingGoal ? editingGoal.createdAt : Date.now(),
      startDate: startDate ? new Date(startDate).getTime() : undefined,
      deadline: deadline ? new Date(deadline).getTime() : undefined,
      reminder: reminder ? new Date(reminder).getTime() : undefined,
      repeat: repeat === "none" ? undefined : repeat,
      customRepeatDays: repeat === "custom" ? customRepeatDays : undefined,
      isCompleted: editingGoal ? editingGoal.isCompleted : false,
      subtasks,
      isHabit,
      habitDays,
      linkedHabitId: !isHabit && linkedHabitId ? linkedHabitId : undefined,
      habitStreak: editingGoal ? editingGoal.habitStreak : 0,
      lastCompletedDate: editingGoal
        ? editingGoal.lastCompletedDate
        : undefined,
      listId: activeListId !== "all" ? activeListId : undefined,
      isStarred: editingGoal ? editingGoal.isStarred : false,
      notifiedStart: editingGoal && editingGoal.startDate === (startDate ? new Date(startDate).getTime() : undefined) ? editingGoal.notifiedStart : false,
      notifiedDeadline: editingGoal && editingGoal.deadline === (deadline ? new Date(deadline).getTime() : undefined) ? editingGoal.notifiedDeadline : false,
      notifiedReminder: editingGoal && editingGoal.reminder === (reminder ? new Date(reminder).getTime() : undefined) ? editingGoal.notifiedReminder : false,
    };

    await db.goals.save(goal);

    if (!editingGoal) {
      resetForm();
      setIsAdding(false);
    } else {
      setEditingGoal(goal);
    }
    loadGoals();
  };

  // Auto-save when editing an existing goal and fields change
  useEffect(() => {
    if (editingGoal && isAdding) {
      const timeoutId = setTimeout(() => {
        handleSave();
      }, 1000); // Debounce save
      return () => clearTimeout(timeoutId);
    }
  }, [
    title,
    details,
    startDate,
    deadline,
    reminder,
    repeat,
    subtasks,
    isHabit,
    habitDays,
  ]);

  const handleDelete = async (id: string) => {
    await db.goals.delete(id);
    if (editingGoal?.id === id) {
      setIsAdding(false);
      resetForm();
    }
    await loadGoals();
    setConfirmDelete(null);
  };

  const handleToggleComplete = async (goal: Goal) => {
    const isCompleted = !goal.isCompleted;
    let newGoal = { ...goal, isCompleted };

    if (goal.isHabit && isCompleted) {
      const today = new Date().setHours(0, 0, 0, 0);
      const lastCompleted = goal.lastCompletedDate
        ? new Date(goal.lastCompletedDate).setHours(0, 0, 0, 0)
        : 0;

      let newStreak = goal.habitStreak || 0;
      if (today - lastCompleted === 86400000) {
        // 1 day difference
        newStreak += 1;
      } else if (today - lastCompleted > 86400000) {
        newStreak = 1; // Reset streak if missed a day
      }

      newGoal = {
        ...newGoal,
        lastCompletedDate: Date.now(),
        habitStreak: newStreak,
        isCompleted: false, // Habits reset daily, so we don't mark the whole goal as completed
        current: goal.current + 1,
      };
    } else {
      newGoal.current = isCompleted ? goal.target : 0;

      // If this task is linked to a habit and was just completed, update the habit
      if (isCompleted && goal.linkedHabitId) {
        const linkedHabit = goals.find((g) => g.id === goal.linkedHabitId);
        if (linkedHabit) {
          const today = new Date().setHours(0, 0, 0, 0);
          const lastCompleted = linkedHabit.lastCompletedDate
            ? new Date(linkedHabit.lastCompletedDate).setHours(0, 0, 0, 0)
            : 0;

          // Only update if not already completed today
          if (today > lastCompleted) {
            let newStreak = linkedHabit.habitStreak || 0;
            if (today - lastCompleted === 86400000) {
              // 1 day difference
              newStreak += 1;
            } else if (today - lastCompleted > 86400000) {
              newStreak = 1; // Reset streak if missed a day
            }

            await db.goals.save({
              ...linkedHabit,
              lastCompletedDate: Date.now(),
              habitStreak: newStreak,
              current: linkedHabit.current + 1,
            });
          }
        }
      }
    }

    await db.goals.save(newGoal);
    loadGoals();
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([
      ...subtasks,
      { id: `sub_${Date.now()}`, title: newSubtask.trim(), isCompleted: false },
    ]);
    setNewSubtask("");
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setSubtasks(
      subtasks.map((st) =>
        st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st,
      ),
    );
  };

  const handleRemoveSubtask = (subtaskId: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== subtaskId));
  };

  const filteredGoals =
    activeListId === "all"
      ? goals
      : goals.filter((g) => g.listId === activeListId);

  const activeGoals = filteredGoals
    .filter((g) => !g.isCompleted && !g.isHabit)
    .sort((a, b) => {
      // Sort starred goals first
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      return 0;
    });
  const completedGoals = filteredGoals.filter(
    (g) => g.isCompleted && !g.isHabit,
  );
  const habits = goals.filter((g) => g.isHabit);

  const handleAddQuickTaskToHabit = async (habitId: string) => {
    const title = prompt("عنوان المهمة الجديدة المرتبطة بهذه العادة:");
    if (!title || !title.trim()) return;

    const newTask: Goal = {
      id: `goal_${Date.now()}`,
      title: title.trim(),
      type: "general",
      target: 1,
      current: 0,
      createdAt: Date.now(),
      isCompleted: false,
      linkedHabitId: habitId,
      listId: activeListId !== "all" ? activeListId : undefined,
    };

    await db.goals.save(newTask);
    loadGoals();
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-10rem)] lg:h-[calc(100vh-6rem)] flex flex-col gap-4">
      {(settings && !settings.hideGoalsIntro) && (
        <div className="bg-card p-6 rounded-3xl border border-olive-200/50 shadow-sm relative group">
          <button
            onClick={handleHideIntro}
            className="absolute top-4 left-4 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all z-20"
            title="إخفاء هذا التعريف"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-olive-900 text-paper rounded-2xl shadow-md shadow-olive-900/20">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-olive-900">
                الأهداف والمهام
              </h1>
              <p className="text-sm text-olive-600 mt-1 leading-relaxed">
                نظم مسيرتك العلمية من خلال تحديد الأهداف، تتبع المهام اليومية، وبناء عادات دراسية مستدامة.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div
          className={cn(
            "flex-1 flex flex-col bg-card rounded-3xl border border-olive-200/50 shadow-sm overflow-hidden",
            isAdding || editingGoal ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="p-4 lg:p-6 border-b border-olive-100 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <select
                value={activeListId}
                onChange={(e) => setActiveListId(e.target.value)}
                className="text-2xl font-serif font-bold text-olive-900 bg-transparent border-none focus:ring-0 p-0 cursor-pointer"
              >
                <option value="all">الأهداف العلمية</option>
                {taskLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setIsCreatingList(true)}
                className="p-1 text-olive-400 hover:text-olive-600 rounded-lg hover:bg-olive-50 transition-colors"
                title="إضافة هدف (قائمة) جديد"
              >
                <Plus className="w-5 h-5" />
              </button>
              {activeListId !== "all" && (
                <button
                  onClick={() =>
                    setConfirmDelete({ type: "list", id: activeListId })
                  }
                  className="p-1 text-olive-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  title="حذف الهدف (القائمة)"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                resetForm();
                setIsAdding(true);
              }}
              className="hidden lg:flex items-center justify-center gap-2 px-4 py-2 bg-olive-900 text-paper rounded-xl hover:bg-olive-800 transition-all duration-200 font-bold shadow-md shadow-olive-900/10 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>مهمة</span>
            </button>
          </div>

          {isCreatingList && (
            <div className="flex items-center gap-2 p-2 bg-olive-50 rounded-xl">
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="اسم الهدف الجديد..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
              />
              <button
                onClick={handleCreateList}
                className="text-olive-600 hover:text-olive-800 p-1"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsCreatingList(false)}
                className="text-olive-400 hover:text-olive-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            <TabButton
              active={activeTab === "tasks"}
              onClick={() => setActiveTab("tasks")}
              icon={ListTodo}
              label="المهام"
            />
            <TabButton
              active={activeTab === "habits"}
              onClick={() => setActiveTab("habits")}
              icon={CalendarDays}
              label="متتبع العادات"
            />
          </div>
        </div>

        {/* FAB for Mobile */}
        {isActiveRoute && (
          <button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="lg:hidden fixed bottom-24 left-6 w-14 h-14 bg-olive-900 text-paper rounded-full shadow-lg shadow-olive-900/20 flex items-center justify-center z-40 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        )}

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-2xl" />
              ))}
            </div>
          ) : activeTab === "tasks" && (
            <div className="space-y-6">
              {/* Quick Add */}
              <form
                onSubmit={handleQuickAdd}
                className="flex items-center gap-3 p-2 border-b border-olive-100 focus-within:border-olive-400 transition-colors"
              >
                <Plus className="w-5 h-5 text-olive-400" />
                <input
                  type="text"
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  placeholder="إضافة مهمة..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-olive-900 placeholder-olive-400"
                />
              </form>

              {/* Active Tasks */}
              <div className="space-y-1">
                {activeGoals.map((goal) => (
                  <TaskItem
                    key={goal.id}
                    goal={goal}
                    onToggle={() => handleToggleComplete(goal)}
                    onClick={() => handleEdit(goal)}
                    onDelete={() =>
                      setConfirmDelete({ type: "goal", id: goal.id })
                    }
                    isActive={editingGoal?.id === goal.id}
                  />
                ))}
                {activeGoals.length === 0 && (
                  <EmptyState icon={Target} message="لا توجد مهام حالية" />
                )}
              </div>

              {/* Completed Tasks */}
              {completedGoals.length > 0 && (
                <div className="pt-6">
                  <h3 className="text-sm font-bold text-olive-400 mb-3 px-2">
                    مكتملة ({completedGoals.length})
                  </h3>
                  <div className="space-y-1">
                    {completedGoals.map((goal) => (
                      <TaskItem
                        key={goal.id}
                        goal={goal}
                        onToggle={() => handleToggleComplete(goal)}
                        onClick={() => handleEdit(goal)}
                        onDelete={() =>
                          setConfirmDelete({ type: "goal", id: goal.id })
                        }
                        isActive={editingGoal?.id === goal.id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLoading && activeTab === "habits" && (
            <div className="space-y-4">
              {/* Quick Add Habit */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!quickAddTitle.trim()) return;
                  const newHabit: Goal = {
                    id: `goal_${Date.now()}`,
                    title: quickAddTitle.trim(),
                    type: "general",
                    target: 1,
                    current: 0,
                    createdAt: Date.now(),
                    isCompleted: false,
                    isHabit: true,
                    habitDays: [0, 1, 2, 3, 4, 5, 6],
                    habitStreak: 0,
                  };
                  db.goals.save(newHabit).then(() => {
                    setQuickAddTitle("");
                    loadGoals();
                  });
                }}
                className="flex items-center gap-3 p-2 border-b border-olive-100 focus-within:border-olive-400 transition-colors mb-4"
              >
                <Plus className="w-5 h-5 text-olive-400" />
                <input
                  type="text"
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  placeholder="إضافة عادة جديدة..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-olive-900 placeholder-olive-400"
                />
              </form>

              {habits.map((habit) => {
                const isCompletedToday = habit.lastCompletedDate
                  ? new Date(habit.lastCompletedDate).setHours(0, 0, 0, 0) ===
                    new Date().setHours(0, 0, 0, 0)
                  : false;

                return (
                  <React.Fragment key={habit.id}>
                    <div
                      className="bg-card p-4 rounded-2xl border border-olive-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => {
                            if (!isCompletedToday) {
                              handleToggleComplete({
                                ...habit,
                                isCompleted: false,
                              });
                            }
                          }}
                          disabled={isCompletedToday}
                          className={cn(
                            "w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-colors",
                            isCompletedToday
                              ? "bg-olive-500 text-white cursor-default"
                              : "bg-olive-100 text-olive-400 hover:bg-olive-200",
                          )}
                        >
                          <CheckCircle2 className="w-6 h-6" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <input
                            type="text"
                            defaultValue={habit.title}
                            onBlur={(e) => {
                              if (e.target.value.trim() !== habit.title) {
                                db.goals
                                  .save({
                                    ...habit,
                                    title: e.target.value.trim(),
                                  })
                                  .then(() => loadGoals());
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                            className="font-bold text-olive-900 text-lg truncate bg-transparent border-none focus:ring-0 p-0 w-full focus:bg-olive-50 focus:px-2 rounded transition-all"
                          />
                          <div className="flex items-center gap-4 text-sm text-olive-500 mt-1 px-2">
                            <div className="flex items-center gap-1.5">
                              <TrendingUp className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">
                                سلسلة: {habit.habitStreak || 0} أيام
                              </span>
                            </div>
                            {/* Show linked tasks count */}
                            {(() => {
                              const linkedTasksCount = goals.filter(
                                (g) =>
                                  g.linkedHabitId === habit.id && !g.isCompleted,
                              ).length;
                              if (linkedTasksCount > 0) {
                                return (
                                  <div
                                    className="flex items-center gap-1.5 text-olive-400"
                                    title="مهام مرتبطة بهذه العادة"
                                  >
                                    <ListTodo className="w-3.5 h-3.5" />
                                    <span>{linkedTasksCount} مهام</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col lg:flex-row items-end lg:items-center gap-3">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {DAYS_OF_WEEK.map((day) => {
                            const isSelected = habit.habitDays?.includes(day.id);
                            return (
                              <div
                                key={day.id}
                                className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                  isSelected
                                    ? "bg-olive-900 text-paper"
                                    : "bg-olive-50 text-olive-300",
                                )}
                              >
                                {day.label}
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() =>
                            setConfirmDelete({ type: "goal", id: habit.id })
                          }
                          className="p-2 text-olive-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 active:scale-95"
                          title="حذف العادة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Linked Tasks Section */}
                    {(() => {
                      const linkedTasks = goals.filter(
                        (g) => g.linkedHabitId === habit.id,
                      );
                      return (
                        <div className="mt-2 pl-4 lg:pl-16 space-y-2">
                          {linkedTasks.map((task) => (
                            <TaskItem
                              key={task.id}
                              goal={task}
                              onToggle={() => handleToggleComplete(task)}
                              onClick={() => handleEdit(task)}
                              onDelete={() =>
                                setConfirmDelete({ type: "goal", id: task.id })
                              }
                              compact
                              isActive={editingGoal?.id === task.id}
                            />
                          ))}
                          <button
                            onClick={() => handleAddQuickTaskToHabit(habit.id)}
                            className="flex items-center gap-2 text-xs font-bold text-olive-400 hover:text-olive-600 px-4 py-2 rounded-xl hover:bg-olive-50 transition-all w-full justify-start border border-dashed border-olive-200"
                          >
                            <Plus className="w-3 h-3" />
                            <span>إضافة مهمة مرتبطة بهذه العادة</span>
                          </button>
                        </div>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
              {habits.length === 0 && (
                <EmptyState
                  icon={CalendarDays}
                  message="لا توجد عادات متتبعة"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Side Panel (Task Details) */}
      {isAdding && (
        <div className="w-full lg:w-96 bg-card rounded-t-3xl lg:rounded-3xl border border-olive-200/50 shadow-2xl lg:shadow-lg flex flex-col overflow-hidden animate-in slide-in-from-bottom-full lg:slide-in-from-right-4 fixed lg:relative inset-x-0 bottom-0 lg:inset-auto z-[60] lg:z-auto h-[90vh] lg:h-auto">
          <div className="w-12 h-1.5 bg-black/10 rounded-full mx-auto mt-3 mb-1 lg:hidden flex-shrink-0" />
          <div className="flex justify-between items-center p-4 border-b border-olive-100 bg-olive-50/50">
            <h2 className="font-bold text-olive-900">
              {editingGoal ? "تفاصيل المهمة" : "مهمة جديدة"}
            </h2>
            <div className="flex items-center gap-1">
              {editingGoal && (
                <button
                  onClick={() =>
                    setConfirmDelete({ type: "goal", id: editingGoal.id })
                  }
                  className="p-2 text-olive-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 active:scale-95"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => {
                  setIsAdding(false);
                  resetForm();
                }}
                className="p-2 text-olive-400 hover:text-olive-900 hover:bg-olive-100 rounded-lg transition-all duration-200 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Title */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان المهمة..."
                className="w-full font-serif text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 placeholder-olive-300 text-olive-900 p-0"
                autoFocus={!editingGoal}
              />
            </div>

            {/* Details */}
            <div className="flex gap-3 items-start">
              <AlignLeft className="w-5 h-5 text-olive-400 mt-1 flex-shrink-0" />
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="إضافة تفاصيل..."
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 p-0 min-h-[60px] resize-y text-sm text-olive-700 placeholder-olive-300"
              />
            </div>

            {/* Date & Time */}
            <div className="space-y-3">
              <div className="flex gap-3 items-center">
                <Calendar className="w-5 h-5 text-olive-400 flex-shrink-0" />
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-olive-400 uppercase">
                      البدء
                    </label>
                    <DatePicker
                      value={startDate}
                      onChange={setStartDate}
                      className="w-full bg-olive-50 border-none rounded-lg p-2 text-sm focus:ring-1 focus:ring-olive-500 transition-colors justify-start"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-olive-400 uppercase">
                      الانتهاء
                    </label>
                    <DatePicker
                      value={deadline}
                      onChange={setDeadline}
                      className="w-full bg-olive-50 border-none rounded-lg p-2 text-sm focus:ring-1 focus:ring-olive-500 transition-colors justify-start"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-center">
                <Repeat className="w-5 h-5 text-olive-400 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <select
                    value={repeat}
                    onChange={(e) => setRepeat(e.target.value as any)}
                    className="w-full bg-olive-50 border-none rounded-lg p-2 text-sm focus:ring-1 focus:ring-olive-500 transition-colors"
                  >
                    {REPEAT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  
                  {repeat === "custom" && (
                    <div className="flex justify-between gap-1 p-2 bg-olive-50 rounded-lg">
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = customRepeatDays.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setCustomRepeatDays(customRepeatDays.filter((d) => d !== day.id));
                              } else {
                                setCustomRepeatDays([...customRepeatDays, day.id]);
                              }
                            }}
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                              isSelected
                                ? "bg-olive-900 text-paper"
                                : "bg-transparent text-olive-500 hover:bg-olive-200",
                            )}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Subtasks */}
            <div className="space-y-2 pt-2">
              <div className="flex gap-3 items-center text-olive-600 font-bold text-sm">
                <ListTodo className="w-5 h-5 flex-shrink-0" />
                <span>المهام الفرعية</span>
              </div>
              <div className="pl-8 space-y-1">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center gap-2 group py-1"
                  >
                    <button
                      onClick={() => handleToggleSubtask(st.id)}
                      className="text-olive-400 hover:text-olive-600"
                    >
                      {st.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-olive-600" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        st.isCompleted && "line-through text-olive-400",
                      )}
                    >
                      {st.title}
                    </span>
                    <button
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 py-1">
                  <Plus className="w-4 h-4 text-olive-400" />
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSubtask()}
                    placeholder="إضافة مهمة فرعية..."
                    className="flex-1 bg-transparent border-none focus:ring-0 p-0 text-sm placeholder-olive-300"
                  />
                </div>
              </div>
            </div>

            {/* Habit Tracker */}
            <div className="space-y-3 pt-4 border-t border-olive-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHabit}
                  onChange={(e) => {
                    setIsHabit(e.target.checked);
                    if (e.target.checked) setLinkedHabitId("");
                  }}
                  className="rounded text-olive-600 focus:ring-olive-500"
                />
                <span className="text-sm font-bold text-olive-600 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  تتبع كعادة مستمرة
                </span>
              </label>

              {isHabit && (
                <div className="flex justify-between gap-1 mt-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = habitDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        onClick={() => {
                          if (isSelected) {
                            setHabitDays(habitDays.filter((d) => d !== day.id));
                          } else {
                            setHabitDays([...habitDays, day.id]);
                          }
                        }}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                          isSelected
                            ? "bg-olive-900 text-paper"
                            : "bg-olive-100 text-olive-500 hover:bg-olive-200",
                        )}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {!isHabit && habits.length > 0 && (
                <div className="mt-4">
                  <label className="text-sm font-bold text-olive-600 flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    ربط بعادة (اختياري)
                  </label>
                  <select
                    value={linkedHabitId}
                    onChange={(e) => setLinkedHabitId(e.target.value)}
                    className="w-full bg-olive-50 border-none rounded-lg p-2 text-sm focus:ring-1 focus:ring-olive-500 transition-colors text-olive-900"
                  >
                    <option value="">بدون ربط</option>
                    {habits.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-olive-500 mt-1">
                    عند إكمال هذه المهمة، سيتم تحديث سلسلة العادة المرتبطة
                    تلقائياً.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Save Button (Only needed when creating new, auto-save handles edits) */}
          {!editingGoal && (
            <div className="p-4 border-t border-olive-100 bg-card pb-safe">
              <button
                onClick={handleSave}
                className="w-full py-3 bg-olive-900 text-paper rounded-xl hover:bg-olive-800 transition-all duration-200 font-bold shadow-md shadow-olive-900/10 active:scale-95"
              >
                حفظ المهمة
              </button>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-olive-900 mb-2">
              تأكيد الحذف
            </h3>
            <p className="text-olive-600 mb-6">
              {confirmDelete.type === "list"
                ? "هل أنت متأكد من حذف هذا الهدف وجميع المهام بداخله؟ لا يمكن التراجع عن هذا الإجراء."
                : (() => {
                    const goalToDelete = goals.find(
                      (g) => g.id === confirmDelete.id,
                    );
                    if (goalToDelete?.isHabit)
                      return "هل أنت متأكد من حذف هذه العادة؟ لا يمكن التراجع عن هذا الإجراء.";
                    return "هل أنت متأكد من حذف هذه المهمة؟";
                  })()}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-olive-50 text-olive-700 font-bold rounded-xl hover:bg-olive-100 transition-all duration-200 active:scale-95"
              >
                إلغاء
              </button>
              <button
                onClick={() =>
                  confirmDelete.type === "list"
                    ? handleDeleteList()
                    : handleDelete(confirmDelete.id)
                }
                className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all duration-200 active:scale-95"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: any;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all",
        active
          ? "bg-olive-100 text-olive-900"
          : "text-olive-500 hover:bg-olive-50",
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

const TaskItem = React.memo(function TaskItem({
  goal,
  onToggle,
  onClick,
  onDelete,
  compact = false,
  isActive = false,
}: {
  goal: Goal;
  onToggle: () => void;
  onClick: () => void;
  onDelete: () => void;
  compact?: boolean;
  isActive?: boolean;
}) {
  const isOverdue =
    goal.deadline &&
    isPast(new Date(goal.deadline)) &&
    !isToday(new Date(goal.deadline)) &&
    !goal.isCompleted;

  const formatDeadline = (timestamp: number) => {
    const date = new Date(timestamp);
    if (isToday(date)) return `اليوم، ${format(date, "h:mm a")}`;
    if (isTomorrow(date)) return `غداً، ${format(date, "h:mm a")}`;
    return format(date, "d MMM", { locale: ar });
  };

  const completedSubtasks = goal.subtasks?.filter((st) => st.isCompleted).length || 0;
  const totalSubtasks = goal.subtasks?.length || 0;
  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : goal.isCompleted ? 100 : 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "optimize-gpu group flex items-center gap-3 p-4 rounded-[1.5rem] border transition-all duration-300 cursor-pointer relative overflow-hidden",
        isActive
          ? "bg-olive-50 border-olive-300 shadow-md"
          : "bg-card border-olive-100 hover:border-olive-300 hover:shadow-lg hover:shadow-olive-900/5",
        goal.isCompleted && "opacity-60 bg-olive-50/50",
      )}
    >
      {/* Progress Background */}
      {totalSubtasks > 0 && !goal.isCompleted && (
        <div 
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-olive-400 to-olive-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors flex-shrink-0 z-10",
          goal.isCompleted
            ? "bg-olive-600 border-olive-600 text-white"
            : "border-olive-300 text-transparent hover:border-olive-500",
        )}
        aria-label={goal.isCompleted ? "تحديد كغير مكتمل" : "تحديد كمكتمل"}
      >
        <Check className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0 z-10">
        <div className="flex items-center gap-2">
          <h3
            className={cn(
              "font-bold text-base truncate transition-all",
              goal.isCompleted ? "text-olive-400 line-through" : "text-olive-900 group-hover:text-olive-700",
            )}
          >
            {goal.title}
          </h3>
          {goal.linkedHabitId && (
            <div
              className="flex items-center gap-1 px-1.5 py-0.5 bg-olive-100 text-olive-600 rounded text-[10px] font-bold"
              title="مرتبطة بعادة"
            >
              <CalendarDays className="w-3 h-3" />
            </div>
          )}
        </div>

        {!compact && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-olive-500">
            {goal.details && (
              <span className="truncate max-w-[150px]">{goal.details}</span>
            )}

            {goal.deadline && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-red-500 font-bold",
                )}
              >
                <Calendar className="w-3 h-3" />
                {formatDeadline(goal.deadline)}
              </span>
            )}

            {totalSubtasks > 0 && (
              <span className="flex items-center gap-1">
                <ListTodo className="w-3 h-3" />
                {completedSubtasks}/{totalSubtasks}
              </span>
            )}

            {goal.repeat && goal.repeat !== "none" && (
              <span className="flex items-center gap-1">
                <Repeat className="w-3 h-3" />
              </span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={async (e) => {
          e.stopPropagation();
          await db.goals.save({ ...goal, isStarred: !goal.isStarred });
          window.dispatchEvent(new CustomEvent("goal-updated"));
        }}
        className={cn(
          "p-2 rounded-xl transition-all flex-shrink-0 z-10",
          goal.isStarred
            ? "text-yellow-500 hover:bg-yellow-50"
            : "text-olive-300 hover:text-olive-500 hover:bg-olive-50",
        )}
        title={goal.isStarred ? "إزالة من المهمة" : "تحديد كمهمة"}
        aria-label={goal.isStarred ? "إزالة من المهمة" : "تحديد كمهمة"}
      >
        <Star className={cn("w-5 h-5", goal.isStarred && "fill-current")} />
      </button>

      {isActive && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-olive-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all flex-shrink-0 z-10"
          title="حذف"
          aria-label="حذف المهمة"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});

const EmptyState = React.memo(function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-olive-400 bg-card rounded-[2rem] border border-olive-100 border-dashed">
      <div className="w-20 h-20 bg-olive-50 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 opacity-50" />
      </div>
      <p className="text-lg font-medium">{message}</p>
    </div>
  );
});
