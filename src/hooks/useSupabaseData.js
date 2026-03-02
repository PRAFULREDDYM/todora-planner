import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

const STORE = 'momentum_v5';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ userName: '', isDark: false });
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('user_name, is_dark')
      .eq('id', user.id)
      .single();

    let profileData = data;

    // If profile doesn't exist (PGRST116), create one
    if (error && error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabase
        .from('profiles')
        .insert({ id: user.id, user_name: '', is_dark: false })
        .select('user_name, is_dark')
        .single();

      if (!insertError && newData) {
        profileData = newData;
      }
    } else if (error) {
      console.error('Error fetching profile:', error);
    }

    if (profileData) {
      setProfile({
        userName: profileData.user_name || '',
        isDark: profileData.is_dark || false,
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (updates) => {
      if (!user) return { error: new Error('Not authenticated') };

      const dbUpdates = {};
      if ('userName' in updates) dbUpdates.user_name = updates.userName;
      if ('isDark' in updates) dbUpdates.is_dark = updates.isDark;

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', user.id);

      if (!error) {
        setProfile((prev) => ({ ...prev, ...updates }));
      }
      return { error };
    },
    [user]
  );

  return { profile, loading, updateProfile, refetch: fetchProfile };
}

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
      return;
    }

    const mapped = (data || []).map(dbTaskToLocal);
    setTasks(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(
    async (task) => {
      if (!user) return { error: new Error('Not authenticated') };

      const dbTask = localTaskToDb(task, user.id);
      const { data, error } = await supabase
        .from('tasks')
        .insert(dbTask)
        .select()
        .single();

      if (!error && data) {
        setTasks((prev) => [...prev, dbTaskToLocal(data)]);
      }
      return { data: data ? dbTaskToLocal(data) : null, error };
    },
    [user]
  );

  const updateTask = useCallback(
    async (taskId, updates) => {
      if (!user) return { error: new Error('Not authenticated') };

      const dbUpdates = {};
      if ('name' in updates) dbUpdates.name = updates.name;
      if ('description' in updates) dbUpdates.description = updates.description;
      if ('recurrence' in updates) dbUpdates.recurrence = updates.recurrence;
      if ('goalMin' in updates) dbUpdates.goal_min = updates.goalMin;
      if ('reminderAt' in updates) dbUpdates.reminder_at = updates.reminderAt;
      if ('priority' in updates) dbUpdates.priority = updates.priority;
      if ('category' in updates) dbUpdates.category = updates.category;
      if ('deadline' in updates) dbUpdates.deadline = updates.deadline;
      if ('image' in updates) dbUpdates.image = updates.image;
      if ('order' in updates) dbUpdates.sort_order = updates.order;
      if ('isStarred' in updates) dbUpdates.is_starred = updates.isStarred;

      const { error } = await supabase
        .from('tasks')
        .update(dbUpdates)
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (!error) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
        );
      }
      return { error };
    },
    [user]
  );

  const deleteTask = useCallback(
    async (taskId) => {
      if (!user) return { error: new Error('Not authenticated') };

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (!error) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
      return { error };
    },
    [user]
  );

  const reorderTasks = useCallback(
    async (reorderedTasks) => {
      if (!user) return { error: new Error('Not authenticated') };

      setTasks(reorderedTasks);

      const updates = reorderedTasks.map((t, idx) => ({
        id: t.id,
        user_id: user.id,
        sort_order: idx,
      }));

      const { error } = await supabase.from('tasks').upsert(updates, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

      return { error };
    },
    [user]
  );

  const bulkUpsertTasks = useCallback(
    async (tasksToUpsert) => {
      if (!user) return { error: new Error('Not authenticated') };

      const dbTasks = tasksToUpsert.map((t) => localTaskToDb(t, user.id));
      const { data, error } = await supabase
        .from('tasks')
        .upsert(dbTasks, { onConflict: 'id' })
        .select();

      if (!error) {
        await fetchTasks();
      }
      return { data, error };
    },
    [user, fetchTasks]
  );

  return {
    tasks,
    setTasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    reorderTasks,
    bulkUpsertTasks,
    refetch: fetchTasks,
  };
}

export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
    } else {
      const mapped = (data || []).map(dbNoteToLocal);
      setNotes(mapped);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotes();
  }, [fetchNotes]);

  const addNote = useCallback(
    async (note) => {
      if (!user) return { error: new Error('Not authenticated') };

      const dbNote = localNoteToDb(note, user.id);
      const { data, error } = await supabase
        .from('notes')
        .insert(dbNote)
        .select()
        .single();

      if (!error && data) {
        setNotes((prev) => [dbNoteToLocal(data), ...prev]);
      }
      return { data: data ? dbNoteToLocal(data) : null, error };
    },
    [user]
  );

  const updateNote = useCallback(
    async (noteId, updates) => {
      if (!user) return { error: new Error('Not authenticated') };

      const dbUpdates = {};
      if ('title' in updates) dbUpdates.title = updates.title;
      if ('content' in updates) dbUpdates.content = updates.content;
      if ('drawing' in updates) dbUpdates.drawing = updates.drawing;
      if ('image' in updates) dbUpdates.image = updates.image;
      if ('isStarred' in updates) dbUpdates.is_starred = updates.isStarred;

      const { error } = await supabase
        .from('notes')
        .update(dbUpdates)
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (!error) {
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n))
        );
      }
      return { error };
    },
    [user]
  );

  const deleteNote = useCallback(
    async (noteId) => {
      if (!user) return { error: new Error('Not authenticated') };

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', user.id);

      if (!error) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      }
      return { error };
    },
    [user]
  );

  const bulkUpsertNotes = useCallback(
    async (notesToUpsert) => {
      if (!user) return { error: new Error('Not authenticated') };

      const dbNotes = notesToUpsert.map((n) => localNoteToDb(n, user.id));
      const { data, error } = await supabase
        .from('notes')
        .upsert(dbNotes, { onConflict: 'id' })
        .select();

      if (!error) {
        await fetchNotes();
      }
      return { data, error };
    },
    [user, fetchNotes]
  );

  return {
    notes,
    setNotes,
    loading,
    addNote,
    updateNote,
    deleteNote,
    bulkUpsertNotes,
    refetch: fetchNotes,
  };
}

export function useTaskHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('task_history')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
    } else {
      const grouped = {};
      (data || []).forEach((entry) => {
        const dateKey = entry.completion_date;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push({
          id: entry.task_id,
          taskName: entry.task_name,
          startedAt: new Date(entry.started_at).getTime(),
          completedAt: new Date(entry.completed_at).getTime(),
        });
      });
      setHistory(grouped);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, [fetchHistory]);

  const addHistoryEntry = useCallback(
    async (taskId, taskName, startedAt, completedAt) => {
      if (!user) return { error: new Error('Not authenticated') };

      const d = new Date(completedAt);
      const pad = (n) => n.toString().padStart(2, "0");
      const completionDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      const { data, error } = await supabase
        .from('task_history')
        .insert({
          user_id: user.id,
          task_id: taskId,
          task_name: taskName,
          completion_date: completionDate,
          started_at: new Date(startedAt).toISOString(),
          completed_at: new Date(completedAt).toISOString(),
        })
        .select()
        .single();

      if (!error && data) {
        setHistory((prev) => {
          const updated = { ...prev };
          if (!updated[completionDate]) updated[completionDate] = [];
          updated[completionDate] = [
            ...updated[completionDate],
            {
              id: taskId,
              taskName: taskName,
              startedAt,
              completedAt,
            },
          ];
          return updated;
        });
      }
      return { data, error };
    },
    [user]
  );

  const deleteHistoryEntry = useCallback(
    async (date, entryIndex) => {
      if (!user) return { error: new Error('Not authenticated') };

      const entries = history[date];
      if (!entries || !entries[entryIndex]) {
        return { error: new Error('Entry not found') };
      }

      const entry = entries[entryIndex];

      const { error } = await supabase
        .from('task_history')
        .delete()
        .eq('user_id', user.id)
        .eq('completion_date', date)
        .eq('started_at', new Date(entry.startedAt).toISOString());

      if (!error) {
        setHistory((prev) => {
          const updated = { ...prev };
          updated[date] = updated[date].filter((_, i) => i !== entryIndex);
          if (updated[date].length === 0) delete updated[date];
          return updated;
        });
      }
      return { error };
    },
    [user, history]
  );

  const bulkInsertHistory = useCallback(
    async (historyObj) => {
      if (!user) return { error: new Error('Not authenticated') };

      const entries = [];
      Object.entries(historyObj).forEach(([date, items]) => {
        items.forEach((item) => {
          entries.push({
            user_id: user.id,
            task_id: item.id,
            task_name: item.taskName || 'Unknown Task',
            completion_date: date,
            started_at: new Date(item.startedAt).toISOString(),
            completed_at: new Date(item.completedAt).toISOString(),
          });
        });
      });

      if (entries.length === 0) return { data: [], error: null };

      const { data, error } = await supabase
        .from('task_history')
        .insert(entries)
        .select();

      if (!error) {
        await fetchHistory();
      }
      return { data, error };
    },
    [user, fetchHistory]
  );

  return {
    history,
    setHistory,
    loading,
    addHistoryEntry,
    deleteHistoryEntry,
    bulkInsertHistory,
    refetch: fetchHistory,
  };
}

export function useDataMigration() {
  const { user } = useAuth();
  const [migrating, setMigrating] = useState(false);

  const checkLocalData = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORE);
      if (!stored) return null;
      const data = JSON.parse(stored);
      const hasTasks = data.tasks && data.tasks.length > 0;
      const hasNotes = data.notes && data.notes.length > 0;
      const hasHistory = data.history && Object.keys(data.history).length > 0;
      if (hasTasks || hasNotes || hasHistory) {
        return data;
      }
    } catch (e) {
      console.error('Error checking local data:', e);
    }
    return null;
  }, []);

  const migrateToSupabase = useCallback(
    async (bulkUpsertTasks, bulkUpsertNotes, bulkInsertHistory) => {
      if (!user) return { error: new Error('Not authenticated') };

      setMigrating(true);
      const localData = checkLocalData();
      if (!localData) {
        setMigrating(false);
        return { migrated: false };
      }

      try {
        const errors = [];

        if (localData.tasks && localData.tasks.length > 0) {
          const tasksWithNewIds = localData.tasks.map((t) => ({
            ...t,
            id: crypto.randomUUID(),
          }));
          const { error } = await bulkUpsertTasks(tasksWithNewIds);
          if (error) errors.push({ type: 'tasks', error });
        }

        if (localData.notes && localData.notes.length > 0) {
          const notesWithNewIds = localData.notes.map((n) => ({
            ...n,
            id: crypto.randomUUID(),
          }));
          const { error } = await bulkUpsertNotes(notesWithNewIds);
          if (error) errors.push({ type: 'notes', error });
        }

        if (localData.history && Object.keys(localData.history).length > 0) {
          const taskNameMap = {};
          (localData.tasks || []).forEach((t) => {
            taskNameMap[t.id] = t.name;
          });

          const historyWithNames = {};
          Object.entries(localData.history).forEach(([date, items]) => {
            historyWithNames[date] = items.map((item) => ({
              ...item,
              taskName: taskNameMap[item.id] || 'Unknown Task',
            }));
          });

          const { error } = await bulkInsertHistory(historyWithNames);
          if (error) errors.push({ type: 'history', error });
        }

        if (errors.length === 0) {
          localStorage.removeItem(STORE);
          localStorage.removeItem('momentum_last_rollover');
        }

        setMigrating(false);
        return {
          migrated: true,
          errors: errors.length > 0 ? errors : null,
        };
      } catch (e) {
        setMigrating(false);
        return { error: e };
      }
    },
    [user, checkLocalData]
  );

  const clearLocalData = useCallback(() => {
    localStorage.removeItem(STORE);
    localStorage.removeItem('momentum_last_rollover');
  }, []);

  return {
    checkLocalData,
    migrateToSupabase,
    clearLocalData,
    migrating,
  };
}

function dbTaskToLocal(dbTask) {
  return {
    id: dbTask.id,
    name: dbTask.name,
    description: dbTask.description || '',
    recurrence: dbTask.recurrence || 'once',
    goalMin: dbTask.goal_min || 0,
    reminderAt: dbTask.reminder_at,
    priority: dbTask.priority || 'mid',
    category: dbTask.category || 'Quick Win',
    deadline: dbTask.deadline,
    image: dbTask.image,
    createdAt: dbTask.created_at,
    order: dbTask.sort_order || 0,
    isStarred: dbTask.is_starred || false,
  };
}

function localTaskToDb(task, userId) {
  return {
    id: task.id,
    user_id: userId,
    name: task.name,
    description: task.description || '',
    recurrence: task.recurrence || 'once',
    goal_min: task.goalMin || 0,
    reminder_at: task.reminderAt || null,
    priority: task.priority || 'mid',
    category: task.category || 'Quick Win',
    deadline: task.deadline || null,
    image: task.image || null,
    created_at: task.createdAt || new Date().toISOString().split('T')[0],
    sort_order: task.order || 0,
    is_starred: task.isStarred || false,
  };
}

function dbNoteToLocal(dbNote) {
  return {
    id: dbNote.id,
    title: dbNote.title || '',
    content: dbNote.content || '',
    drawing: dbNote.drawing,
    image: dbNote.image,
    date: dbNote.note_date,
    isStarred: dbNote.is_starred || false,
  };
}

function localNoteToDb(note, userId) {
  return {
    id: note.id,
    user_id: userId,
    title: note.title || '',
    content: note.content || '',
    drawing: note.drawing || null,
    image: note.image || null,
    note_date: note.date || new Date().toISOString().split('T')[0],
    is_starred: note.isStarred || false,
  };
}
