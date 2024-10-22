<script lang="ts">
  import { onMount } from "svelte";

  interface TodoList {
    id: string;
    label: string;
    tasks: { text: string; completed: boolean }[];
  }

  let inputText = "";
  let tasks: { text: string; completed: boolean }[] = [];
  let listLabel = "";
  let savedLists: TodoList[] = [];
  let selectedListId: string | null = null;

  onMount(() => {
    const saved = localStorage.getItem("savedTodoLists");
    if (saved) {
      savedLists = JSON.parse(saved);
    }
  });

  function createTasks() {
    const newTasks = inputText
      .split(/\n|•|-/)
      .map((task) => task.trim())
      .filter((task) => task !== "")
      .map((task) => ({ text: task, completed: false }));

    if (selectedListId) {
      const listIndex = savedLists.findIndex(
        (list) => list.id === selectedListId
      );
      if (listIndex !== -1) {
        savedLists[listIndex].tasks = [
          ...savedLists[listIndex].tasks,
          ...newTasks,
        ];
        savedLists = [...savedLists];
        localStorage.setItem("savedTodoLists", JSON.stringify(savedLists));
      }
    } else {
      tasks = [...tasks, ...newTasks];
    }
    inputText = "";
  }

  function toggleTask(listId: string | null, index: number) {
    if (listId) {
      const listIndex = savedLists.findIndex((list) => list.id === listId);
      if (listIndex !== -1) {
        savedLists[listIndex].tasks[index].completed =
          !savedLists[listIndex].tasks[index].completed;
        savedLists = [...savedLists];
        localStorage.setItem("savedTodoLists", JSON.stringify(savedLists));
      }
    } else {
      tasks[index].completed = !tasks[index].completed;
      tasks = [...tasks];
    }
  }

  function clearTasks() {
    if (selectedListId) {
      const listIndex = savedLists.findIndex(
        (list) => list.id === selectedListId
      );
      if (listIndex !== -1) {
        savedLists[listIndex].tasks = [];
        savedLists = [...savedLists];
        localStorage.setItem("savedTodoLists", JSON.stringify(savedLists));
      }
    } else {
      tasks = [];
    }
  }

  function saveList() {
    if (listLabel && (tasks.length > 0 || selectedListId)) {
      if (selectedListId) {
        const listIndex = savedLists.findIndex(
          (list) => list.id === selectedListId
        );
        if (listIndex !== -1) {
          savedLists[listIndex].label = listLabel;
          savedLists = [...savedLists];
        }
      } else {
        const newList = { id: Date.now().toString(), label: listLabel, tasks };
        savedLists = [...savedLists, newList];
        tasks = [];
      }
      localStorage.setItem("savedTodoLists", JSON.stringify(savedLists));
      listLabel = "";
      selectedListId = null;
    }
  }

  function selectList(listId: string) {
    selectedListId = listId;
    const selectedList = savedLists.find((list) => list.id === listId);
    if (selectedList) {
      listLabel = selectedList.label;
      tasks = [...selectedList.tasks];
    }
  }

  function deleteSavedList(index: number) {
    savedLists = savedLists.filter((_, i) => i !== index);
    localStorage.setItem("savedTodoLists", JSON.stringify(savedLists));
    if (savedLists[index]?.id === selectedListId) {
      selectedListId = null;
      tasks = [];
      listLabel = "";
    }
  }
</script>

<main class="max-w-md mx-auto p-4 space-y-4 bg-white shadow-lg rounded-lg">
  <h1 class="text-2xl font-bold text-center text-gray-800">
    Enhanced Todo List Creator
  </h1>

  {#if savedLists.length > 0}
    <div class="space-y-2">
      <h2 class="text-xl font-semibold text-gray-700">Saved Lists:</h2>
      {#each savedLists as list, index}
        <div class="flex items-center space-x-2">
          <button
            on:click={() => selectList(list.id)}
            class="flex-grow bg-gray-200 p-2 rounded flex items-center hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 {selectedListId ===
            list.id
              ? 'bg-blue-200'
              : ''}"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fill-rule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clip-rule="evenodd"
              />
            </svg>
            {list.label} ({list.tasks.length})
          </button>
          <button
            on:click={() => deleteSavedList(index)}
            class="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="space-y-2">
    <h2 class="text-xl font-semibold text-gray-700">
      {selectedListId ? "Edit List" : "Create New List"}
    </h2>
    <input
      type="text"
      placeholder="List Label"
      bind:value={listLabel}
      class="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
    <textarea
      placeholder="Enter tasks (one per line, or use • or - for bullets)"
      bind:value={inputText}
      class="w-full p-2 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
    ></textarea>
    <div class="flex space-x-2">
      <button
        on:click={createTasks}
        class="flex-grow bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
      >
        {selectedListId ? "Add Tasks" : "Create Tasks"}
      </button>
      <button
        on:click={saveList}
        class="flex-grow bg-green-500 text-white p-2 rounded flex items-center justify-center hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 mr-2"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z"
          />
        </svg>
        {selectedListId ? "Update List" : "Save New List"}
      </button>
    </div>
  </div>

  <div class="space-y-2">
    <h2 class="text-xl font-semibold text-gray-700">Your Todo List:</h2>
    {#each selectedListId ? savedLists.find((list) => list.id === selectedListId)?.tasks || [] : tasks as task, index}
      <div class="flex items-center space-x-2 bg-gray-50 p-2 rounded">
        <input
          type="checkbox"
          id="task-{index}"
          bind:checked={task.completed}
          on:change={() => toggleTask(selectedListId, index)}
          class="form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out"
        />
        <label
          for="task-{index}"
          class="flex-grow {task.completed
            ? 'line-through text-gray-500'
            : 'text-gray-700'}"
        >
          {task.text}
        </label>
      </div>
    {/each}
    <button
      on:click={clearTasks}
      class="w-full bg-red-500 text-white p-2 rounded flex items-center justify-center hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5 mr-2"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
          clip-rule="evenodd"
        />
      </svg>
      Clear All Tasks
    </button>
  </div>
</main>
