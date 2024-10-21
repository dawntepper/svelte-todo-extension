<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";

  type Todo = {
    id: number;
    text: string;
    completed: boolean;
    label?: string;
  };

  let todos: Todo[] = [];
  let newTodo = "";
  let bulkInput = "";
  let currentLabel = "";
  let labels: string[] = [];
  let mounted = false;
  let unsubscribe: () => void;

  onMount(() => {
    mounted = true;
    loadTodos();
    loadLabels();

    unsubscribe = addStorageListener();
  });

  onDestroy(() => {
    mounted = false;
    if (unsubscribe) {
      unsubscribe();
    }
  });

  function addStorageListener(): () => void {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === "sync") {
        if (changes.todos && mounted) {
          todos = changes.todos.newValue;
        }
        if (changes.labels && mounted) {
          labels = changes.labels.newValue;
        }
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  function addTodo(): void {
    if (newTodo.trim()) {
      const updatedTodos = [
        ...todos,
        {
          id: Date.now(),
          text: newTodo.trim(),
          completed: false,
          label: currentLabel,
        },
      ];
      saveTodos(updatedTodos);
      newTodo = "";
    }
  }

  function toggleTodo(id: number): void {
    const updatedTodos = todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    saveTodos(updatedTodos);
  }

  function deleteTodo(id: number): void {
    const updatedTodos = todos.filter((todo) => todo.id !== id);
    saveTodos(updatedTodos);
  }

  function createTasksFromInput(): void {
    const newTasks = bulkInput
      .split(/\n|•|-/)
      .map((task) => task.trim())
      .filter((task) => task !== "")
      .map((task) => ({
        id: Date.now() + Math.random(),
        text: task,
        completed: false,
        label: currentLabel,
      }));
    const updatedTodos = [...todos, ...newTasks];
    saveTodos(updatedTodos);
    bulkInput = "";
  }

  function addLabel(): void {
    if (currentLabel && !labels.includes(currentLabel)) {
      const updatedLabels = [...labels, currentLabel];
      saveLabels(updatedLabels);
    }
  }

  function saveTodos(updatedTodos: Todo[]): void {
    chrome.storage.sync.set({ todos: updatedTodos });
  }

  function loadTodos(): void {
    chrome.storage.sync.get(["todos"], (result) => {
      if (mounted && result.todos) {
        todos = result.todos;
      }
    });
  }

  function saveLabels(updatedLabels: string[]): void {
    chrome.storage.sync.set({ labels: updatedLabels });
  }

  function loadLabels(): void {
    chrome.storage.sync.get(["labels"], (result) => {
      if (mounted && result.labels) {
        labels = result.labels;
      }
    });
  }
</script>

<main>
  <h1>Enhanced Todo List</h1>

  <div class="input-group">
    <input type="text" bind:value={newTodo} placeholder="Add a new todo" />
    <select bind:value={currentLabel}>
      <option value="">No Label</option>
      {#each labels as label}
        <option value={label}>{label}</option>
      {/each}
    </select>
    <button on:click={addTodo}>Add</button>
  </div>

  <div class="input-group">
    <input type="text" bind:value={currentLabel} placeholder="New label" />
    <button on:click={addLabel}>Add Label</button>
  </div>

  <div class="task-list">
    {#each todos as todo (todo.id)}
      <div class="task" transition:fade={{ duration: 200 }}>
        <input
          type="checkbox"
          checked={todo.completed}
          on:change={() => toggleTodo(todo.id)}
        />
        <span class:completed={todo.completed}>{todo.text}</span>
        {#if todo.label}
          <span class="label">{todo.label}</span>
        {/if}
        <button class="delete-btn" on:click={() => deleteTodo(todo.id)}
          >×</button
        >
      </div>
    {/each}
  </div>

  <div class="input-group">
    <textarea bind:value={bulkInput} placeholder="Enter tasks (one per line)"
    ></textarea>
    <button on:click={createTasksFromInput}>Create Tasks</button>
  </div>
</main>

<style>
  :root {
    --primary-color: #3498db;
    --secondary-color: #2ecc71;
    --background-color: #f5f5f5;
    --text-color: #333;
    --border-color: #ddd;
  }

  main {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    max-width: 400px;
    margin: 0 auto;
    padding: 20px;
    background-color: var(--background-color);
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  h1 {
    text-align: center;
    color: var(--primary-color);
    margin-bottom: 20px;
  }

  .input-group {
    display: flex;
    margin-bottom: 20px;
  }

  input[type="text"],
  select,
  textarea {
    flex-grow: 1;
    padding: 10px;
    margin-right: 10px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    font-size: 14px;
  }

  textarea {
    height: 100px;
    resize: vertical;
  }

  button {
    padding: 10px 15px;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  button:hover {
    background-color: #2980b9;
  }

  .task-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 20px;
    background-color: white;
  }

  .task {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    padding: 10px;
    background-color: #fff;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: background-color 0.3s ease;
  }

  .task:hover {
    background-color: #f9f9f9;
  }

  .completed {
    text-decoration: line-through;
    color: #888;
  }

  .label {
    background-color: var(--secondary-color);
    color: white;
    padding: 2px 5px;
    border-radius: 3px;
    margin-left: 5px;
    font-size: 0.8em;
  }

  .delete-btn {
    background-color: transparent;
    color: #e74c3c;
    font-size: 18px;
    padding: 0 5px;
    margin-left: auto;
  }

  .delete-btn:hover {
    background-color: #e74c3c;
    color: white;
  }

  .task-list::-webkit-scrollbar {
    width: 8px;
  }

  .task-list::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  .task-list::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 4px;
  }

  .task-list::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
</style>
