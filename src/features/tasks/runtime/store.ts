type TaskStateListener = () => void;

const listeners = new Set<TaskStateListener>();
let revision = 0;

export function getTaskStateRevision(): number {
  return revision;
}

export function publishTaskStateChange(): void {
  revision += 1;
  for (const listener of listeners) listener();
}

export function subscribeTaskState(listener: TaskStateListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
