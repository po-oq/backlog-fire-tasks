import { useState, useMemo } from 'react';
import type { Task } from '../types';

export type FilterType = 'all' | 'overdue' | 'due-tomorrow';

// タスクフィルタリングのカスタムフック（担当者・プロジェクトフィルタ拡張版）
export function useTaskFilter(tasks: Task[]) {
  // ✨ 3つのフィルタ状態を管理
  const [statusFilter, setStatusFilter] = useState<FilterType>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // 🔍 利用可能な担当者リストを動的生成（MEMBER_KEYSベース）
  const availableAssignees = useMemo(() => {
    const assignees = new Set<string>();
    tasks.forEach(task => {
      if (task.assigneeName) {
        assignees.add(task.assigneeName);
      }
    });
    return ['all', ...Array.from(assignees).sort()];
  }, [tasks]);

  // 📁 利用可能なプロジェクトリストを動的生成（PROJECT_KEYSベース）
  const availableProjects = useMemo(() => {
    const projects = new Set<string>();
    tasks.forEach(task => {
      projects.add(task.projectKey);
    });
    return ['all', ...Array.from(projects).sort()];
  }, [tasks]);

  // 🎯 複合フィルタリング処理（useMemoで最適化）
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. ステータスフィルタ（既存ロジック）
      let matchesStatus = true;
      switch (statusFilter) {
        case 'overdue':
          matchesStatus = task.isOverdue;
          break;
        case 'due-tomorrow':
          matchesStatus = task.isDueTomorrow;
          break;
        case 'all':
        default:
          matchesStatus = true;
          break;
      }

      // 2. 担当者フィルタ（新規）
      const matchesAssignee = assigneeFilter === 'all' || 
        task.assigneeName === assigneeFilter;

      // 3. プロジェクトフィルタ（新規）
      const matchesProject = projectFilter === 'all' || 
        task.projectKey === projectFilter;

      return matchesStatus && matchesAssignee && matchesProject;
    });
  }, [tasks, statusFilter, assigneeFilter, projectFilter]);

  // 📊 統計計算（useMemoで最適化）
  const stats = useMemo(() => ({
    totalTasks: tasks.length,
    overdueTasks: tasks.filter(task => task.isOverdue).length,
    dueTomorrowTasks: tasks.filter(task => task.isDueTomorrow).length,
    completedTasks: tasks.filter(task => task.status === '完了').length,
    filteredCount: filteredTasks.length
  }), [tasks, filteredTasks]);

  return {
    // ステータスフィルタ（既存互換性のため）
    currentFilter: statusFilter,
    setCurrentFilter: setStatusFilter,
    
    // 新規フィルタ
    statusFilter,
    setStatusFilter,
    assigneeFilter,
    setAssigneeFilter,
    projectFilter,
    setProjectFilter,
    
    // データ
    filteredTasks,
    stats,
    availableAssignees,
    availableProjects
  };
}