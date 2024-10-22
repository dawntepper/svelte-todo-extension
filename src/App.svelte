<script lang="ts">
  import { onMount } from "svelte";

  interface TodoList {
    label: string;
    tasks: { text: string; completed: boolean }[];
  }

  let inputText = "";
  let tasks: { text: string; completed: boolean }[] = [];
  let listLabel = "";
  let savedLists: TodoList[] = [];

  onMount(() => {
    const saved = localStorage.getItem("savedTodoLists");
    if (saved) {
      savedLists = JSON.parse(saved);
    }
  });

  function createTasks() {
    tasks = inputText
      .split(/\n|•|-/)
      .map((task) => task.trim())
      .filter((task) => task !== "")
      .map((task) => ({ text: task, completed: false }));
    inputText = "";
  }

  function toggleTask(index: number) {
    tasks[index].completed = !tasks[index].completed;
    tasks = [...tasks];
  }

  function clearTasks() {
    tasks = [];
  }

  function saveList() {
    if (listLabel && tasks.length > 0) {
      const newList = { label: listLabel, tasks };
      savedLists = [...savedLists, newList];
      localStorage.setItem("savedTodoLists", JSON.stringify(savedLists));
      listLabel = "";
    }
  }

  function loadList(list: TodoList) {
    tasks = [...list.tasks];
  }

  function deleteSavedList(index: number) {
    savedLists = savedLists.filter((_, i) => i !== index);
    localStorage.setItem("savedTodoLists", JSON.stringify(savedLists));
  }
</script>

<main class="max-w-md mx-auto p-4 space-y-4">
  <h1 class="text-2xl font-bold text-center">Enhanced Todo List Creator</h1>
  <textarea
    placeholder="Paste your list here (one item per line, or use • or - for bullets)"
    bind:value={inputText}
    class="min-h-[150px] w-full p-2 border rounded"
  ></textarea>
  <button
    on:click={createTasks}
    class="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
  >
    Create Todo List
  </button>
  {#if tasks.length > 0}
    <div class="space-y-2">
      <h2 class="text-xl font-semibold">Your Todo List:</h2>
      {#each tasks as task, index}
        <div class="flex items-center space-x-2">
          <input
            type="checkbox"
            id="task-{index}"
            bind:checked={task.completed}
            on:change={() => toggleTask(index)}
            class="form-checkbox h-5 w-5 text-blue-600"
          />
          <label
            for="task-{index}"
            class="flex-grow {task.completed
              ? 'line-through text-gray-500'
              : ''}"
          >
            {task.text}
          </label>
        </div>
      {/each}
      <div class="flex space-x-2 mt-4">
        <button
          on:click={clearTasks}
          class="bg-red-500 text-white p-2 rounded flex items-center hover:bg-red-600 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2"
            ><path d="M3 6h18"></path><path
              d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
            ></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line
              x1="10"
              y1="11"
              x2="10"
              y2="17"
            ></line><line x1="14" y1="11" x2="14" y2="17"></line></svg
          >
          Clear All
        </button>
        <input
          type="text"
          placeholder="List Label"
          bind:value={listLabel}
          class="flex-grow p-2 border rounded"
        />
        <button
          on:click={saveList}
          class="bg-green-500 text-white p-2 rounded flex items-center hover:bg-green-600 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2"
            ><path
              d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
            ></path><polyline points="17 21 17 13 7 13 7 21"
            ></polyline><polyline points="7 3 7 8 15 8"></polyline></svg
          >
          Save List
        </button>
      </div>
    </div>
  {/if}
  {#if savedLists.length > 0}
    <div class="space-y-2">
      <h2 class="text-xl font-semibold">Saved Lists:</h2>
      {#each savedLists as list, index}
        <div class="flex items-center space-x-2">
          <button
            on:click={() => loadList(list)}
            class="flex-grow bg-gray-200 p-2 rounded flex items-center hover:bg-gray-300 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="mr-2"
              ><line x1="8" y1="6" x2="21" y2="6"></line><line
                x1="8"
                y1="12"
                x2="21"
                y2="12"
              ></line><line x1="8" y1="18" x2="21" y2="18"></line><line
                x1="3"
                y1="6"
                x2="3.01"
                y2="6"
              ></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line
                x1="3"
                y1="18"
                x2="3.01"
                y2="18"
              ></line></svg
            >
            {list.label}
          </button>
          <button
            on:click={() => deleteSavedList(index)}
            class="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><path d="M3 6h18"></path><path
                d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"
              ></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line
                x1="10"
                y1="11"
                x2="10"
                y2="17"
              ></line><line x1="14" y1="11" x2="14" y2="17"></line></svg
            >
          </button>
        </div>
      {/each}
    </div>
  {/if}
</main>

<style>
  :global(body) {
    background-color: #f3f4f6;
    color: #1f2937;
  }
</style>
