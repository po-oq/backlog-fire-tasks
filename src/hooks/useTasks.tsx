import { useState, useEffect } from 'react';
import type { Task } from '../types';

// タスクデータフェッチのカスタムフック
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tasks');
        
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
    };

    fetchTasks();
  }, []);

  return {
    tasks,
    loading,
    error,
    lastUpdated,
    refetch: () => {
      setLoading(true);
      setError(null);
      // 再フェッチロジックは同じ
    }
  };
}