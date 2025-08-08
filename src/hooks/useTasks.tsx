import { useState, useEffect, useCallback } from 'react';
import type { Task } from '../types';

// タスクデータフェッチのカスタムフック
export function useTasks(viewMode: 'assignee' | 'creator' = 'assignee') {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks?mode=${viewMode}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'タスク取得に失敗しました');
      }
      
      const tasksData: Task[] = await response.json();
      setTasks(tasksData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    lastUpdated,
    refetch: fetchTasks
  };
}