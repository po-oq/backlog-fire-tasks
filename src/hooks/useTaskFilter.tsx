import { useState, useMemo } from 'react';
import type { Task } from '../types';

export type FilterType = 'all' | 'overdue' | 'due-tomorrow';

// タスクフィルタリングのカスタムフック
export function useTaskFilter(tasks: Task[]) {
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');

  // フィルタリング処理（useMemoで最適化）
  const filteredTasks = useMemo(() => {
    switch (currentFilter) {
      case 'overdue':
        return tasks.filter(task => task.isOverdue);
      case 'due-tomorrow':
        return tasks.filter(task => task.isDueTomorrow);
      case 'all':
      default:
        return tasks;
    }
  }, [tasks, currentFilter]);

  // 統計計算（useMemoで最適化）
  const stats = useMemo(() => ({
    totalTasks: tasks.length,
    overdueTasks: tasks.filter(task => task.isOverdue).length,
    dueTomorrowTasks: tasks.filter(task => task.isDueTomorrow).length,
    completedTasks: tasks.filter(task => task.status === '完了').length
  }), [tasks]);

  return {
    currentFilter,
    setCurrentFilter,
    filteredTasks,
    stats
  };
}